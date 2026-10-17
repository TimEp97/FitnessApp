<?php
/**
 * ATHLETIC – Server-Sicherung pro Konto
 *
 * Speichert den Datenstand des angemeldeten Nutzers in der Datenbank und legt
 * pro Tag eine Kopie als Historie an (die letzten 90 Tage).
 *
 *   GET  api/sync.php   → { revision, savedAt, data }
 *   PUT  api/sync.php   ← { baseRevision, force, data }  → { revision, savedAt }
 *                         409 mit aktuellem Stand, wenn baseRevision veraltet ist
 *
 * Angemeldet wird über auth.php (Cookie).
 */

declare(strict_types=1);

require __DIR__ . '/_lib.php';

const MAX_BYTES = 20 * 1024 * 1024;
const KEEP_DAILY_COPIES = 90;

$user = require_user();
$userId = (int) $user['id'];

function read_state(int $userId, bool $forUpdate = false): array
{
    $sql = 'SELECT revision, saved_at, data FROM athletic_user_state WHERE user_id = ?' . ($forUpdate && !is_sqlite(db()) ? ' FOR UPDATE' : '');
    $q = db()->prepare($sql);
    $q->execute([$userId]);
    $row = $q->fetch();
    if ($row === false || $row['data'] === 'null') {
        return ['revision' => (int) ($row['revision'] ?? 0), 'savedAt' => null, 'data' => null];
    }
    $data = json_decode($row['data'], true);
    if (!is_array($data)) {
        reply(500, ['error' => 'corrupt_state']);
    }
    return ['revision' => (int) $row['revision'], 'savedAt' => $row['saved_at'], 'data' => $data];
}

function encode(array $data): string
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        reply(500, ['error' => 'write_failed']);
    }
    return $json;
}

if (method() === 'GET') {
    reply(200, read_state($userId));
}

if (method() !== 'PUT' && method() !== 'POST') {
    reply(405, ['error' => 'method_not_allowed']);
}

$body = body(MAX_BYTES);
if (!is_array($body['data'] ?? null)) {
    reply(400, ['error' => 'invalid_body']);
}
foreach (['exercises', 'plans', 'workouts', 'bodyLogs', 'deleted'] as $k) {
    if (!is_array($body['data'][$k] ?? null)) {
        reply(400, ['error' => 'invalid_body', 'field' => $k]);
    }
}

try {
    tx_begin();
    // Zeile anlegen, falls noch keine existiert, damit die Sperre greift
    db()->prepare(insert_ignore() . " INTO athletic_user_state (user_id, revision, saved_at, data) VALUES (?, 0, '', 'null')")->execute([$userId]);
    $state = read_state($userId, true);
    $force = ($body['force'] ?? false) === true;
    if (!$force && ($body['baseRevision'] ?? null) !== $state['revision']) {
        tx_rollback();
        reply(409, $state);
    }

    // Tageskopie des bisherigen Stands als Historie
    if ($state['data'] !== null) {
        $copy = db()->prepare(insert_ignore() . ' INTO athletic_user_history (user_id, day, revision, saved_at, data) VALUES (?, ?, ?, ?, ?)');
        $copy->execute([$userId, date('Y-m-d'), $state['revision'], (string) $state['savedAt'], encode($state['data'])]);
        if ($copy->rowCount() > 0) {
            db()->prepare('DELETE FROM athletic_user_history WHERE user_id = ? AND day < ?')
                ->execute([$userId, date('Y-m-d', now() - KEEP_DAILY_COPIES * 86400)]);
        }
    }

    $next = ['revision' => $state['revision'] + 1, 'savedAt' => iso()];
    db()->prepare('UPDATE athletic_user_state SET revision = ?, saved_at = ?, data = ? WHERE user_id = ?')
        ->execute([$next['revision'], $next['savedAt'], encode($body['data']), $userId]);
    tx_commit();
} catch (PDOException) {
    tx_rollback();
    reply(500, ['error' => 'write_failed']);
}
reply(200, $next);
