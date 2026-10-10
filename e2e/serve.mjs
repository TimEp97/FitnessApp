// Startet den gebauten Stand wie auf einem PHP-Webspace (z. B. all-inkl):
// statische Dateien plus api/sync.php. Ohne PHP wird auf vite preview ausgewichen.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';

export const E2E_SYNC_KEY = 'e2e-test-key-0123456789abcdef';
const site = '.e2e-site';
const port = process.env.PORT ?? '4173';

const hasPhp = spawnSync('php', ['-v']).status === 0;
let child;
if (hasPhp) {
  rmSync(site, { recursive: true, force: true });
  cpSync('dist', site, { recursive: true });
  writeFileSync(`${site}/api/config.php`, `<?php define('SYNC_KEY', '${E2E_SYNC_KEY}');\n`);
  child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', site], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } });
} else {
  console.warn('PHP fehlt – Sync-Tests werden übersprungen.');
  child = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { stdio: 'inherit' });
}
const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
