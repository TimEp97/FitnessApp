<?php
/**
 * ATHLETIC – Konten
 *
 *   GET  auth.php?action=status            → { setupNeeded }
 *   POST auth.php?action=setup             ← { username, email, password, code }   erstes Konto (Admin), Code = SETUP_CODE bzw. SYNC_KEY
 *   POST auth.php?action=register          ← { username, email, password, invite }
 *   POST auth.php?action=login             ← { login, password }                   login = Benutzername oder E-Mail
 *   POST auth.php?action=logout
 *   GET  auth.php?action=me                → { user }
 *   POST auth.php?action=change_password   ← { current, password }
 *   POST auth.php?action=forgot            ← { login }                             schickt einen Link zum Zurücksetzen
 *   POST auth.php?action=reset             ← { token, password }
 *   POST auth.php?action=delete_account    ← { password }
 *
 *   nur Admin:
 *   GET  auth.php?action=admin_users                → { users }
 *   POST auth.php?action=admin_user_update          ← { id, blocked }
 *   POST auth.php?action=admin_user_reset_link      ← { id }           → { link }
 *   POST auth.php?action=admin_user_delete          ← { id }
 *   GET  auth.php?action=admin_invites              → { invites }
 *   POST auth.php?action=admin_invite_create        ← { note }         → { invite }
 *   POST auth.php?action=admin_invite_delete        ← { code }
 *
 * Angemeldet wird über ein HttpOnly-Cookie. Passwörter liegen nur als Hash in der Datenbank.
 */

declare(strict_types=1);

require __DIR__ . '/_lib.php';

$action = (string) ($_GET['action'] ?? '');
$readOnly = ['status', 'me', 'admin_users', 'admin_invites'];
if (in_array($action, $readOnly, true) ? method() !== 'GET' : method() !== 'POST') {
    reply(405, ['error' => 'method_not_allowed']);
}

// ---------- Prüfungen ----------

function valid_username(string $name): string
{
    $name = trim($name);
    if (!preg_match('/^[A-Za-z0-9._-]{3,24}$/', $name)) {
        reply(422, ['error' => 'invalid_username']);
    }
    return $name;
}

function valid_email(string $email): string
{
    $email = strtolower(trim($email));
    if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        reply(422, ['error' => 'invalid_email']);
    }
    return $email;
}

function valid_password(string $password): string
{
    if (strlen($password) < PASSWORD_MIN || strlen($password) > 200) {
        reply(422, ['error' => 'weak_password']);
    }
    return $password;
}

/** Legt einen Nutzer an. Benutzername und E-Mail müssen frei sein. */
function create_user(string $username, string $email, string $password, string $role): int
{
    $q = db()->prepare('SELECT username_key, email FROM athletic_users WHERE username_key = ? OR email = ?');
    $q->execute([strtolower($username), $email]);
    foreach ($q->fetchAll() as $row) {
        reply(409, ['error' => $row['email'] === $email ? 'email_taken' : 'username_taken']);
    }
    db()->prepare('INSERT INTO athletic_users (username, username_key, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$username, strtolower($username), $email, hash_password($password), $role, now()]);
    return (int) db()->lastInsertId();
}

function find_user(string $login): ?array
{
    $login = strtolower(trim($login));
    $q = db()->prepare('SELECT * FROM athletic_users WHERE username_key = ? OR email = ?');
    $q->execute([$login, $login]);
    $u = $q->fetch();
    return $u === false ? null : $u;
}

function user_by_id(int $id): ?array
{
    $q = db()->prepare('SELECT * FROM athletic_users WHERE id = ?');
    $q->execute([$id]);
    $u = $q->fetch();
    return $u === false ? null : $u;
}

function user_count(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM athletic_users')->fetchColumn();
}

function delete_user_data(int $id): void
{
    foreach (['athletic_user_state', 'athletic_user_history', 'athletic_sessions', 'athletic_resets'] as $t) {
        db()->prepare("DELETE FROM $t WHERE user_id = ?")->execute([$id]);
    }
    db()->prepare('DELETE FROM athletic_invites WHERE created_by = ? AND used_by IS NULL')->execute([$id]);
    db()->prepare('DELETE FROM athletic_users WHERE id = ?')->execute([$id]);
}

/** Einladungscode: 12 Zeichen ohne verwechselbare Zeichen, angezeigt als XXXX-XXXX-XXXX. */
function new_invite_code(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 12; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

function normalize_code(string $code): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
}

function format_code(string $code): string
{
    return implode('-', str_split($code, 4));
}

function create_reset_link(int $userId): string
{
    $token = random_token();
    db()->prepare('DELETE FROM athletic_resets WHERE user_id = ? OR expires_at < ?')->execute([$userId, now()]);
    db()->prepare('INSERT INTO athletic_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        ->execute([token_hash($token), $userId, now() + RESET_MINUTES * 60]);
    return app_url() . '#/passwort-neu/' . $token;
}

/** Übernimmt den Datenstand aus der Zeit vor den Konten (Tabelle athletic_state) für den ersten Admin. */
function adopt_legacy_state(int $userId): void
{
    try {
        $row = db()->query('SELECT revision, saved_at, data FROM athletic_state WHERE id = 1')->fetch();
    } catch (PDOException) {
        return; // keine alte Tabelle
    }
    if ($row === false || $row['data'] === 'null') {
        return;
    }
    db()->prepare(insert_ignore() . ' INTO athletic_user_state (user_id, revision, saved_at, data) VALUES (?, ?, ?, ?)')
        ->execute([$userId, (int) $row['revision'], $row['saved_at'], $row['data']]);
}

// ---------- Aktionen ----------

$ip = 'ip:' . client_ip();

switch ($action) {
    case 'status':
        reply(200, ['setupNeeded' => user_count() === 0]);

    case 'setup':
        $b = body();
        if (too_many("setup:$ip", 10, 3600)) {
            reply(429, ['error' => 'too_many_attempts']);
        }
        $expected = defined('SETUP_CODE') && SETUP_CODE !== '' ? SETUP_CODE : (defined('SYNC_KEY') ? SYNC_KEY : '');
        if (strlen($expected) < 12 || !hash_equals($expected, trim(str_field($b, 'code')))) {
            note_attempt("setup:$ip");
            usleep(400000);
            reply(403, ['error' => 'invalid_setup_code']);
        }
        if (user_count() > 0) {
            reply(409, ['error' => 'already_setup']);
        }
        $username = valid_username(str_field($b, 'username'));
        $email = valid_email(str_field($b, 'email'));
        $password = valid_password(str_field($b, 'password'));
        tx_begin();
        if (user_count() > 0) {
            tx_rollback();
            reply(409, ['error' => 'already_setup']);
        }
        $id = create_user($username, $email, $password, 'admin');
        adopt_legacy_state($id);
        tx_commit();
        start_session($id);
        reply(200, ['user' => public_user(user_by_id($id))]);

    case 'register':
        $b = body();
        if (too_many("register:$ip", 10, 3600)) {
            reply(429, ['error' => 'too_many_attempts']);
        }
        $code = normalize_code(str_field($b, 'invite', 40));
        $username = valid_username(str_field($b, 'username'));
        $email = valid_email(str_field($b, 'email'));
        $password = valid_password(str_field($b, 'password'));
        tx_begin();
        $q = db()->prepare('SELECT code FROM athletic_invites WHERE code = ? AND used_by IS NULL AND expires_at > ?');
        $q->execute([$code, now()]);
        if ($q->fetch() === false) {
            tx_rollback();
            note_attempt("register:$ip");
            reply(403, ['error' => 'invalid_invite']);
        }
        try {
            $id = create_user($username, $email, $password, 'user');
        } catch (PDOException) {
            tx_rollback();
            reply(409, ['error' => 'username_taken']);
        }
        db()->prepare('UPDATE athletic_invites SET used_by = ?, used_at = ? WHERE code = ?')->execute([$id, now(), $code]);
        tx_commit();
        start_session($id);
        reply(200, ['user' => public_user(user_by_id($id))]);

    case 'login':
        $b = body();
        $login = strtolower(trim(str_field($b, 'login', 190)));
        $password = str_field($b, 'password');
        if (too_many("login:$login", 5, 900) || too_many("login:$ip", 20, 900)) {
            reply(429, ['error' => 'too_many_attempts']);
        }
        $u = find_user($login);
        if ($u === null || !password_verify($password, $u['password_hash'])) {
            note_attempt("login:$login");
            note_attempt("login:$ip");
            usleep(300000);
            reply(401, ['error' => 'invalid_credentials']);
        }
        if ((int) $u['blocked'] === 1) {
            reply(403, ['error' => 'blocked']);
        }
        if (password_needs_rehash($u['password_hash'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE athletic_users SET password_hash = ? WHERE id = ?')->execute([hash_password($password), $u['id']]);
        }
        clear_attempts("login:$login");
        start_session((int) $u['id']);
        reply(200, ['user' => public_user($u)]);

    case 'logout':
        end_session();
        reply(200);

    case 'me':
        reply(200, ['user' => public_user(require_user())]);

    case 'change_password':
        $u = require_user();
        $b = body();
        if (!password_verify(str_field($b, 'current'), $u['password_hash'])) {
            usleep(300000);
            reply(403, ['error' => 'wrong_password']);
        }
        $password = valid_password(str_field($b, 'password'));
        db()->prepare('UPDATE athletic_users SET password_hash = ? WHERE id = ?')->execute([hash_password($password), $u['id']]);
        // andere Geräte abmelden, dieses bleibt angemeldet
        db()->prepare('DELETE FROM athletic_sessions WHERE user_id = ? AND token_hash <> ?')->execute([$u['id'], token_hash((string) session_token())]);
        reply(200);

    case 'forgot':
        $b = body();
        $login = strtolower(trim(str_field($b, 'login', 190)));
        if (too_many("forgot:$ip", 10, 3600) || too_many("forgot:$login", 3, 3600)) {
            reply(429, ['error' => 'too_many_attempts']);
        }
        note_attempt("forgot:$ip");
        note_attempt("forgot:$login");
        $u = find_user($login);
        // Antwort immer gleich, damit sich nicht prüfen lässt, ob es ein Konto gibt
        if ($u !== null && (int) $u['blocked'] === 0) {
            $link = create_reset_link((int) $u['id']);
            send_mail(
                $u['email'],
                'ATHLETIC: Passwort zurücksetzen',
                "Hallo {$u['username']},\n\n"
                . "für dein ATHLETIC-Konto wurde ein neues Passwort angefordert. Über diesen Link kannst du es festlegen (gültig für " . RESET_MINUTES . " Minuten):\n\n"
                . "$link\n\n"
                . "Wenn du das nicht warst, ignoriere diese E-Mail. Dein bisheriges Passwort bleibt dann gültig.\n",
            );
        }
        reply(200);

    case 'reset':
        $b = body();
        if (too_many("reset:$ip", 20, 3600)) {
            reply(429, ['error' => 'too_many_attempts']);
        }
        $token = str_field($b, 'token', 64);
        $password = valid_password(str_field($b, 'password'));
        $q = db()->prepare('SELECT user_id FROM athletic_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?');
        $q->execute([token_hash($token), now()]);
        $userId = $q->fetchColumn();
        if ($userId === false) {
            note_attempt("reset:$ip");
            reply(403, ['error' => 'invalid_reset']);
        }
        db()->prepare('UPDATE athletic_users SET password_hash = ? WHERE id = ?')->execute([hash_password($password), $userId]);
        db()->prepare('UPDATE athletic_resets SET used_at = ? WHERE token_hash = ?')->execute([now(), token_hash($token)]);
        db()->prepare('DELETE FROM athletic_sessions WHERE user_id = ?')->execute([$userId]);
        reply(200);

    case 'delete_account':
        $u = require_user();
        $b = body();
        if (!password_verify(str_field($b, 'password'), $u['password_hash'])) {
            usleep(300000);
            reply(403, ['error' => 'wrong_password']);
        }
        if ($u['role'] === 'admin' && (int) db()->query("SELECT COUNT(*) FROM athletic_users WHERE role = 'admin'")->fetchColumn() <= 1 && user_count() > 1) {
            reply(409, ['error' => 'last_admin']);
        }
        delete_user_data((int) $u['id']);
        set_session_cookie('', now() - 3600);
        reply(200);

    // ---------- Admin ----------

    case 'admin_users':
        require_admin();
        $rows = db()->query('SELECT u.*, s.saved_at FROM athletic_users u LEFT JOIN athletic_user_state s ON s.user_id = u.id ORDER BY u.created_at')->fetchAll();
        reply(200, ['users' => array_map(fn ($r) => public_user($r) + [
            'blocked' => (int) $r['blocked'] === 1,
            'lastLoginAt' => $r['last_login_at'] ? iso((int) $r['last_login_at']) : null,
            'lastSyncAt' => $r['saved_at'] ?: null,
        ], $rows)]);

    case 'admin_user_update':
        $admin = require_admin();
        $b = body();
        $id = (int) ($b['id'] ?? 0);
        if ($id === (int) $admin['id']) {
            reply(409, ['error' => 'self']);
        }
        if (user_by_id($id) === null) {
            reply(404, ['error' => 'not_found']);
        }
        $blocked = ($b['blocked'] ?? false) === true;
        db()->prepare('UPDATE athletic_users SET blocked = ? WHERE id = ?')->execute([$blocked ? 1 : 0, $id]);
        if ($blocked) {
            db()->prepare('DELETE FROM athletic_sessions WHERE user_id = ?')->execute([$id]);
        }
        reply(200);

    case 'admin_user_reset_link':
        require_admin();
        $id = (int) (body()['id'] ?? 0);
        if (user_by_id($id) === null) {
            reply(404, ['error' => 'not_found']);
        }
        reply(200, ['link' => create_reset_link($id)]);

    case 'admin_user_delete':
        $admin = require_admin();
        $id = (int) (body()['id'] ?? 0);
        if ($id === (int) $admin['id']) {
            reply(409, ['error' => 'self']);
        }
        if (user_by_id($id) === null) {
            reply(404, ['error' => 'not_found']);
        }
        delete_user_data($id);
        reply(200);

    case 'admin_invites':
        require_admin();
        $rows = db()->query('SELECT i.*, u.username AS used_by_name FROM athletic_invites i LEFT JOIN athletic_users u ON u.id = i.used_by ORDER BY i.created_at DESC')->fetchAll();
        reply(200, ['invites' => array_map(fn ($r) => [
            'code' => format_code($r['code']),
            'note' => $r['note'],
            'createdAt' => iso((int) $r['created_at']),
            'expiresAt' => iso((int) $r['expires_at']),
            'usedBy' => $r['used_by_name'],
            'usedAt' => $r['used_at'] ? iso((int) $r['used_at']) : null,
            'link' => app_url() . '#/registrieren/' . format_code($r['code']),
        ], $rows)]);

    case 'admin_invite_create':
        $admin = require_admin();
        $note = trim(str_field(body(), 'note', 100));
        $code = new_invite_code();
        db()->prepare('INSERT INTO athletic_invites (code, note, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$code, $note, $admin['id'], now(), now() + INVITE_DAYS * 86400]);
        reply(200, ['invite' => ['code' => format_code($code), 'link' => app_url() . '#/registrieren/' . format_code($code)]]);

    case 'admin_invite_delete':
        require_admin();
        $code = normalize_code(str_field(body(), 'code', 40));
        db()->prepare('DELETE FROM athletic_invites WHERE code = ? AND used_by IS NULL')->execute([$code]);
        reply(200);

    default:
        reply(404, ['error' => 'unknown_action']);
}
