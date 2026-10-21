// Startet den gebauten Stand wie auf einem PHP-Webspace (z. B. all-inkl):
// statische Dateien plus api/*.php, Datenbank als SQLite-Datei, Mails in eine Logdatei.
// PHP wird über PHP_BIN gesucht, sonst im PATH.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const SITE = '.e2e-site';
export const SETUP_CODE = 'e2e-setup-code-0123456789';
const port = process.env.PORT ?? '4173';
const php = process.env.PHP_BIN || 'php';

if (spawnSync(php, ['-v']).status !== 0) {
  console.error('PHP fehlt. Installiere PHP 8 (mit pdo_sqlite) oder setze PHP_BIN auf php.exe.');
  process.exit(1);
}

rmSync(SITE, { recursive: true, force: true });
cpSync('dist', SITE, { recursive: true });
const data = resolve(SITE, 'api', 'data');
mkdirSync(data, { recursive: true });
const p = (f) => join(data, f).replaceAll('\\', '/');
writeFileSync(
  `${SITE}/api/config.php`,
  `<?php
define('DB_DSN', 'sqlite:${p('e2e.sqlite')}');
define('SETUP_CODE', '${SETUP_CODE}');
define('MAIL_LOG', '${p('mail.log')}');
`,
);

// Unter Windows ist pdo_sqlite nicht fest eingebaut
const args = process.platform === 'win32' ? ['-d', `extension_dir=${join(dirname(php === 'php' ? spawnSync('where', ['php']).stdout.toString().split(/\r?\n/)[0] : php), 'ext')}`, '-d', 'extension=pdo_sqlite'] : [];
args.push('-d', 'log_errors=1', '-d', `error_log=${p('php-error.log')}`);
const child = spawn(php, [...args, '-S', `127.0.0.1:${port}`, '-t', SITE], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } });
const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
