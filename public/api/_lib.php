<?php
/**
 * ATHLETIC – gemeinsame Server-Funktionen für auth.php und sync.php:
 * Konfiguration, Datenbank (MySQL/MariaDB, für Tests auch SQLite), Sitzungen,
 * Bremse gegen Rateversuche und E-Mail-Versand.
 *
 * Wird nie direkt aufgerufen (per .htaccess gesperrt).
 */

declare(strict_types=1);

const SCHEMA_VERSION = 1;
const SESSION_COOKIE = 'athletic_session';
const SESSION_DAYS = 90;
const RESET_MINUTES = 60;
const INVITE_DAYS = 14;
const PASSWORD_MIN = 10;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function reply(int $status, array $body = []): never
{
    http_response_code($status);
    echo json_encode($body ?: ['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    reply(503, ['error' => 'not_configured']);
}
require $configFile;

// Nur Anfragen der App selbst: der eigene Header erzwingt bei fremden Seiten eine CORS-Vorabfrage, die nie erlaubt wird.
if (($_SERVER['HTTP_X_ATHLETIC'] ?? '') !== '1') {
    reply(403, ['error' => 'forbidden']);
}

function now(): int
{
    return time();
}

function iso(?int $t = null): string
{
    return gmdate('Y-m-d\TH:i:s\Z', $t ?? now());
}

// ---------- Datenbank ----------

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 10];
    try {
        if (defined('DB_DSN') && DB_DSN !== '') {
            $pdo = new PDO(DB_DSN, defined('DB_USER') ? DB_USER : null, defined('DB_PASS') ? DB_PASS : null, $options);
        } elseif (defined('DB_NAME') && DB_NAME !== '') {
            $pdo = new PDO(
                'mysql:host=' . (defined('DB_HOST') ? DB_HOST : 'localhost') . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                defined('DB_USER') ? DB_USER : DB_NAME,
                defined('DB_PASS') ? DB_PASS : '',
                $options,
            );
        } else {
            reply(503, ['error' => 'not_configured', 'hint' => 'Datenbank in config.php eintragen (DB_NAME, DB_USER, DB_PASS)']);
        }
    } catch (PDOException) {
        reply(500, ['error' => 'storage_unavailable', 'hint' => 'Verbindung zur Datenbank fehlgeschlagen']);
    }
    migrate($pdo);
    return $pdo;
}

function is_sqlite(PDO $pdo): bool
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
}

/** „INSERT IGNORE“ in der Schreibweise der Datenbank */
function insert_ignore(): string
{
    return is_sqlite(db()) ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
}

/** Legt die Tabellen an. Die alte Tabelle athletic_state (ein Nutzer) bleibt unverändert als Sicherung bestehen. */
function migrate(PDO $pdo): void
{
    try {
        $version = (int) $pdo->query("SELECT v FROM athletic_meta WHERE k = 'schema'")->fetchColumn();
    } catch (PDOException) {
        $version = 0;
    }
    if ($version >= SCHEMA_VERSION) {
        return;
    }
    $sqlite = is_sqlite($pdo);
    $id = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
    $text = $sqlite ? 'TEXT' : 'LONGTEXT';
    $end = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $tables = [
        "athletic_meta (k VARCHAR(32) NOT NULL PRIMARY KEY, v VARCHAR(255) NOT NULL)",
        "athletic_users (
            id $id,
            username VARCHAR(32) NOT NULL,
            username_key VARCHAR(32) NOT NULL UNIQUE,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(10) NOT NULL DEFAULT 'user',
            created_at INT NOT NULL,
            last_login_at INT NULL,
            blocked TINYINT NOT NULL DEFAULT 0
        )",
        "athletic_sessions (
            token_hash CHAR(64) NOT NULL PRIMARY KEY,
            user_id INT NOT NULL,
            created_at INT NOT NULL,
            expires_at INT NOT NULL,
            user_agent VARCHAR(200) NOT NULL DEFAULT ''
        )",
        "athletic_invites (
            code VARCHAR(32) NOT NULL PRIMARY KEY,
            note VARCHAR(100) NOT NULL DEFAULT '',
            created_by INT NOT NULL,
            created_at INT NOT NULL,
            expires_at INT NOT NULL,
            used_by INT NULL,
            used_at INT NULL
        )",
        "athletic_resets (
            token_hash CHAR(64) NOT NULL PRIMARY KEY,
            user_id INT NOT NULL,
            expires_at INT NOT NULL,
            used_at INT NULL
        )",
        "athletic_attempts (id $id, scope VARCHAR(250) NOT NULL, at INT NOT NULL)",
        "athletic_user_state (
            user_id INT NOT NULL PRIMARY KEY,
            revision INT NOT NULL,
            saved_at CHAR(20) NOT NULL,
            data $text NOT NULL
        )",
        "athletic_user_history (
            user_id INT NOT NULL,
            day CHAR(10) NOT NULL,
            revision INT NOT NULL,
            saved_at CHAR(20) NOT NULL,
            data $text NOT NULL,
            PRIMARY KEY (user_id, day)
        )",
    ];
    foreach ($tables as $t) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS $t$end");
    }
    $pdo->exec(($sqlite ? 'INSERT OR IGNORE' : 'INSERT IGNORE') . " INTO athletic_meta (k, v) VALUES ('schema', '0')");
    $pdo->prepare("UPDATE athletic_meta SET v = ? WHERE k = 'schema'")->execute([(string) SCHEMA_VERSION]);
}

/** Exklusive Sperre bis tx_commit(), damit Prüfen und Schreiben nicht verzahnt ablaufen. */
function tx_begin(): void
{
    $pdo = db();
    if (is_sqlite($pdo)) {
        $pdo->exec('BEGIN IMMEDIATE');
    } else {
        $pdo->beginTransaction();
    }
}

function tx_commit(): void
{
    $pdo = db();
    if (is_sqlite($pdo)) {
        $pdo->exec('COMMIT');
    } elseif ($pdo->inTransaction()) {
        $pdo->commit();
    }
}

function tx_rollback(): void
{
    $pdo = db();
    try {
        if (is_sqlite($pdo)) {
            $pdo->exec('ROLLBACK');
        } elseif ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    } catch (PDOException) {
        // keine offene Transaktion
    }
}

// ---------- Anfrage ----------

function method(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/** JSON-Körper der Anfrage als Array (höchstens $max Bytes). */
function body(int $max = 64 * 1024): array
{
    $raw = file_get_contents('php://input', false, null, 0, $max + 1);
    if ($raw === false || strlen($raw) > $max) {
        reply(413, ['error' => 'too_large']);
    }
    $data = json_decode($raw === '' ? '{}' : $raw, true);
    if (!is_array($data)) {
        reply(400, ['error' => 'invalid_body']);
    }
    return $data;
}

function str_field(array $body, string $key, int $max = 200): string
{
    $v = $body[$key] ?? '';
    if (!is_string($v) || strlen($v) > $max) {
        reply(400, ['error' => 'invalid_body', 'field' => $key]);
    }
    return $v;
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

/** Verzeichnis der App, z. B. „/“ oder „/athletic/“ (api/ liegt darunter). */
function app_path(): string
{
    $dir = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'), 2));
    return rtrim($dir, '/') . '/';
}

function app_url(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    if (!preg_match('/^[a-z0-9.\-:\[\]]+$/i', $host)) {
        $host = 'localhost';
    }
    return (is_https() ? 'https://' : 'http://') . $host . app_path();
}

// ---------- Bremse gegen Rateversuche ----------

function too_many(string $scope, int $max, int $windowSeconds): bool
{
    if (random_int(1, 50) === 1) {
        db()->prepare('DELETE FROM athletic_attempts WHERE at < ?')->execute([now() - 86400]);
    }
    $q = db()->prepare('SELECT COUNT(*) FROM athletic_attempts WHERE scope = ? AND at > ?');
    $q->execute([$scope, now() - $windowSeconds]);
    return (int) $q->fetchColumn() >= $max;
}

function note_attempt(string $scope): void
{
    db()->prepare('INSERT INTO athletic_attempts (scope, at) VALUES (?, ?)')->execute([$scope, now()]);
}

function clear_attempts(string $scope): void
{
    db()->prepare('DELETE FROM athletic_attempts WHERE scope = ?')->execute([$scope]);
}

// ---------- Nutzer und Sitzungen ----------

function random_token(): string
{
    return bin2hex(random_bytes(32));
}

function token_hash(string $token): string
{
    return hash('sha256', $token);
}

function hash_password(string $password): string
{
    return password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
}

function public_user(array $u): array
{
    return [
        'id' => (int) $u['id'],
        'username' => $u['username'],
        'email' => $u['email'],
        'role' => $u['role'],
        'createdAt' => iso((int) $u['created_at']),
    ];
}

function set_session_cookie(string $value, int $expires): void
{
    setcookie(SESSION_COOKIE, $value, [
        'expires' => $expires,
        'path' => app_path(),
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function start_session(int $userId): void
{
    $token = random_token();
    $expires = now() + SESSION_DAYS * 86400;
    db()->prepare('INSERT INTO athletic_sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)')
        ->execute([token_hash($token), $userId, now(), $expires, substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200)]);
    db()->prepare('UPDATE athletic_users SET last_login_at = ? WHERE id = ?')->execute([now(), $userId]);
    set_session_cookie($token, $expires);
}

function session_token(): ?string
{
    $t = $_COOKIE[SESSION_COOKIE] ?? '';
    return is_string($t) && preg_match('/^[0-9a-f]{64}$/', $t) ? $t : null;
}

/** Angemeldeter Nutzer oder null. Verlängert die Sitzung höchstens einmal pro Tag. */
function current_user(): ?array
{
    $token = session_token();
    if ($token === null) {
        return null;
    }
    $q = db()->prepare('SELECT u.*, s.expires_at AS session_expires FROM athletic_sessions s JOIN athletic_users u ON u.id = s.user_id WHERE s.token_hash = ?');
    $q->execute([token_hash($token)]);
    $u = $q->fetch();
    if ($u === false || (int) $u['session_expires'] < now() || (int) $u['blocked'] === 1) {
        db()->prepare('DELETE FROM athletic_sessions WHERE token_hash = ?')->execute([token_hash($token)]);
        return null;
    }
    $renewed = now() + SESSION_DAYS * 86400;
    if ($renewed - (int) $u['session_expires'] > 86400) {
        db()->prepare('UPDATE athletic_sessions SET expires_at = ? WHERE token_hash = ?')->execute([$renewed, token_hash($token)]);
        db()->prepare('UPDATE athletic_users SET last_login_at = ? WHERE id = ?')->execute([now(), $u['id']]);
        set_session_cookie($token, $renewed);
    }
    return $u;
}

function require_user(): array
{
    $u = current_user();
    if ($u === null) {
        usleep(200000);
        reply(401, ['error' => 'unauthorized']);
    }
    return $u;
}

function require_admin(): array
{
    $u = require_user();
    if ($u['role'] !== 'admin') {
        reply(403, ['error' => 'forbidden']);
    }
    return $u;
}

function end_session(): void
{
    $token = session_token();
    if ($token !== null) {
        db()->prepare('DELETE FROM athletic_sessions WHERE token_hash = ?')->execute([token_hash($token)]);
    }
    set_session_cookie('', now() - 3600);
}

// ---------- E-Mail ----------

/**
 * Versendet eine Textmail über PHP mail() (bei all-inkl ohne weitere Einrichtung).
 * Mit MAIL_LOG in config.php landen die Mails stattdessen in einer Datei (Tests).
 */
function send_mail(string $to, string $subject, string $text): bool
{
    if (defined('MAIL_LOG') && MAIL_LOG !== '') {
        return file_put_contents(MAIL_LOG, json_encode(['to' => $to, 'subject' => $subject, 'text' => $text], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX) !== false;
    }
    $host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    // ohne MAIL_FROM: noreply@ an der Hauptdomain (gym.example.de → noreply@example.de)
    $from = defined('MAIL_FROM') && MAIL_FROM !== '' ? MAIL_FROM : 'noreply@' . implode('.', array_slice(explode('.', (string) $host), -2));
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $headers = implode("\r\n", [
        'From: ATHLETIC <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers, '-f' . $from);
}
