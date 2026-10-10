<?php
/**
 * ATHLETIC – Server-Sicherung
 *
 * Speichert den Datenstand der App als JSON-Datei auf dem eigenen Webspace
 * (z. B. all-inkl) und legt pro Tag eine Kopie als Historie an.
 *
 * Einrichtung: config.example.php nach config.php kopieren und dort den
 * Schlüssel eintragen, den die App im Profil unter „Server-Sicherung“ erzeugt.
 *
 *   GET  api/sync.php   → { revision, savedAt, data }
 *   PUT  api/sync.php   ← { baseRevision, force, data }  → { revision, savedAt }
 *                         409 mit aktuellem Stand, wenn baseRevision veraltet ist
 *
 * Authentifizierung über den Header „X-Sync-Key“.
 */

declare(strict_types=1);

const MAX_BYTES = 20 * 1024 * 1024;
const KEEP_DAILY_COPIES = 90;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function reply(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    reply(503, ['error' => 'not_configured']);
}
require $configFile;
if (!defined('SYNC_KEY') || !is_string(SYNC_KEY) || strlen(SYNC_KEY) < 24) {
    reply(503, ['error' => 'not_configured', 'hint' => 'SYNC_KEY in config.php fehlt oder ist kürzer als 24 Zeichen']);
}

$key = $_SERVER['HTTP_X_SYNC_KEY'] ?? '';
if (!is_string($key) || !hash_equals(SYNC_KEY, $key)) {
    usleep(400000); // Rateversuche bremsen
    reply(401, ['error' => 'unauthorized']);
}

$dir = __DIR__ . '/data';
$historyDir = $dir . '/history';
foreach ([$dir, $historyDir] as $d) {
    if (!is_dir($d) && !mkdir($d, 0700, true) && !is_dir($d)) {
        reply(500, ['error' => 'storage_unavailable']);
    }
}
// Datenordner gegen direkten Abruf sperren (Apache, wie bei all-inkl)
$htaccess = $dir . '/.htaccess';
if (!is_file($htaccess)) {
    file_put_contents($htaccess, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
}

$file = $dir . '/athletic.json';
$lockHandle = fopen($dir . '/.lock', 'c');
if ($lockHandle === false) {
    reply(500, ['error' => 'storage_unavailable']);
}

function readState(string $file): array
{
    if (!is_file($file)) {
        return ['revision' => 0, 'savedAt' => null, 'data' => null];
    }
    $state = json_decode((string) file_get_contents($file), true);
    if (!is_array($state) || !isset($state['revision'])) {
        reply(500, ['error' => 'corrupt_state']);
    }
    return $state;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    flock($lockHandle, LOCK_SH);
    $state = readState($file);
    flock($lockHandle, LOCK_UN);
    reply(200, $state);
}

if ($method !== 'PUT' && $method !== 'POST') {
    reply(405, ['error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if ($raw === false || strlen($raw) > MAX_BYTES) {
    reply(413, ['error' => 'too_large']);
}
$body = json_decode($raw, true);
if (!is_array($body) || !is_array($body['data'] ?? null)) {
    reply(400, ['error' => 'invalid_body']);
}
foreach (['exercises', 'plans', 'workouts', 'bodyLogs', 'deleted'] as $k) {
    if (!is_array($body['data'][$k] ?? null)) {
        reply(400, ['error' => 'invalid_body', 'field' => $k]);
    }
}

flock($lockHandle, LOCK_EX);
$state = readState($file);
$force = ($body['force'] ?? false) === true;
$base = $body['baseRevision'] ?? null;
if (!$force && $base !== $state['revision']) {
    flock($lockHandle, LOCK_UN);
    reply(409, $state);
}

// Tageskopie des bisherigen Stands als Historie
if (is_file($file)) {
    $daily = $historyDir . '/athletic-' . date('Y-m-d') . '.json';
    if (!is_file($daily)) {
        copy($file, $daily);
        $copies = glob($historyDir . '/athletic-*.json') ?: [];
        sort($copies);
        foreach (array_slice($copies, 0, max(0, count($copies) - KEEP_DAILY_COPIES)) as $old) {
            unlink($old);
        }
    }
}

$next = [
    'revision' => (int) $state['revision'] + 1,
    'savedAt' => gmdate('Y-m-d\TH:i:s\Z'),
    'data' => $body['data'],
];
$tmp = $file . '.tmp';
$json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $file)) {
    flock($lockHandle, LOCK_UN);
    reply(500, ['error' => 'write_failed']);
}
flock($lockHandle, LOCK_UN);
reply(200, ['revision' => $next['revision'], 'savedAt' => $next['savedAt']]);
