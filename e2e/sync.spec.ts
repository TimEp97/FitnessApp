import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding, startWorkoutFromTraining } from './helpers';

const KEY = 'e2e-test-key-0123456789abcdef';

async function phpAvailable(page: Page) {
  const res = await page.request.get('/api/sync.php', { headers: { 'X-Sync-Key': KEY } });
  return res.headers()['content-type']?.includes('application/json') ?? false;
}

async function connectSync(page: Page) {
  await page.goto('/#/profil');
  await page.getByLabel('Schlüssel', { exact: true }).fill(KEY);
  await page.getByRole('button', { name: 'Verbinden' }).click();
}

async function syncAndWait(page: Page) {
  await page.goto('/#/profil');
  await page.getByRole('button', { name: 'Jetzt sichern' }).click();
  await expect(page.getByTestId('sync-status')).toContainText('Gesichert', { timeout: 10_000 });
}

test('7. Server-Sicherung: Historie geht auf ein zweites Gerät über, Löschungen werden übertragen', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  test.skip(!(await phpAvailable(a)), 'kein PHP-Server');

  // Gerät A: einrichten (Server leer → hochladen), Workout protokollieren
  await skipOnboarding(a);
  await connectSync(a);
  await expect(a.getByTestId('sync-enabled')).toBeVisible();
  await startWorkoutFromTraining(a);
  await a.getByTestId(/stepper-(Zusatzg|G)ewicht/).click();
  await a.getByRole('textbox', { name: /ewicht/ }).fill('17,5');
  await a.keyboard.press('Enter');
  await a.getByRole('button', { name: 'Satz abschließen' }).click();
  await a.getByRole('button', { name: 'Beenden', exact: true }).click();
  await a.getByRole('button', { name: 'Beenden und speichern' }).click();
  await expect(a).toHaveURL(/zusammenfassung\//);
  const summaryUrl = a.url().split('#')[1];
  await syncAndWait(a);

  // Gerät B: neuer Browser, Serverdaten übernehmen
  const b = await (await browser.newContext()).newPage();
  await skipOnboarding(b);
  await connectSync(b);
  await expect(b.getByRole('dialog', { name: 'Sicherung gefunden' })).toBeVisible();
  await b.getByRole('button', { name: 'Serverdaten übernehmen' }).click();
  await expect(b.getByTestId('sync-enabled')).toBeVisible();
  await b.goto(`/#${summaryUrl}`);
  await expect(b.getByTestId('summary-sets')).toHaveText('1');
  await expect(b.getByText('17,5×')).toBeVisible();

  // Gerät B löscht einen Plan, Gerät A übernimmt die Löschung
  await b.goto('/#/training');
  const planName = 'Ganzkörper';
  await b.getByRole('link', { name: `${planName} bearbeiten` }).click();
  await b.getByRole('button', { name: 'Plan löschen' }).click();
  await b.getByRole('dialog').getByRole('button', { name: 'Plan löschen' }).click();
  await expect(b.getByRole('button', { name: new RegExp(`^${planName}`) })).toHaveCount(0);
  await syncAndWait(b);

  await syncAndWait(a);
  await a.goto('/#/training');
  await expect(a.getByRole('button', { name: new RegExp(`^${planName}`) })).toHaveCount(0);
  await expect(a.getByRole('button', { name: /^Push \/ Pull \/ Beine/ })).toBeVisible();

  // Nach einem Neuladen bleibt alles erhalten
  await a.reload();
  await a.goto(`/#${summaryUrl}`);
  await expect(a.getByTestId('summary-sets')).toHaveText('1');
});

test('8. Falscher Schlüssel wird direkt am Feld gemeldet', async ({ page }) => {
  test.skip(!(await phpAvailable(page)), 'kein PHP-Server');
  await skipOnboarding(page);
  await page.goto('/#/profil');
  await page.getByLabel('Schlüssel', { exact: true }).fill('falscher-schluessel-0123456789');
  await page.getByRole('button', { name: 'Verbinden' }).click();
  await expect(page.getByRole('alert')).toContainText('Schlüssel passt nicht');
  await expect(page.getByTestId('sync-enabled')).toHaveCount(0);
});
