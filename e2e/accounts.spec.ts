import { expect, test, type Page } from '@playwright/test';
import { ADMIN, createInvite, lastMailTo, loginViaForm, newCredentials, signUp, skipOnboarding, startWorkoutFromTraining, syncAndWait } from './helpers';

async function logOneSet(page: Page, weight: string) {
  await startWorkoutFromTraining(page);
  await page.getByTestId(/stepper-(Zusatzg|G)ewicht/).click();
  await page.getByRole('textbox', { name: /ewicht/ }).fill(weight);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await page.getByRole('button', { name: 'Beenden und speichern' }).click();
  await expect(page).toHaveURL(/zusammenfassung\//);
  return page.url().split('#')[1];
}

test('A1. Gleiches Konto auf zweitem Gerät: Historie kommt mit, Löschungen werden übertragen', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const creds = await skipOnboarding(a);
  const summaryUrl = await logOneSet(a, '17,5');
  await syncAndWait(a);

  // Gerät B: über das Formular mit der E-Mail anmelden, Daten kommen vom Server
  const b = await (await browser.newContext()).newPage();
  await loginViaForm(b, creds.email, creds.password);
  await expect(b.getByTestId('today-card')).toBeVisible();
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
});

test('A2. Ein anderes Konto sieht keine fremden Trainings', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await skipOnboarding(a);
  const summaryUrl = await logOneSet(a, '42,5');
  await syncAndWait(a);

  const b = await (await browser.newContext()).newPage();
  await skipOnboarding(b);
  await b.goto(`/#${summaryUrl}`);
  await expect(b.getByText('Workout nicht gefunden')).toBeVisible();
  await b.goto('/#/fortschritt');
  await expect(b.getByText('42,5')).toHaveCount(0);
});

test('A3. Registrieren nur mit gültigem Einladungscode, der Link füllt den Code aus', async ({ page }) => {
  const creds = newCredentials();
  await page.goto('/#/registrieren');
  await page.getByLabel('Einladungscode').fill('AAAA-BBBB-CCCC');
  await page.getByLabel('Benutzername').fill(creds.username);
  await page.getByLabel('E-Mail').fill(creds.email);
  await page.getByLabel('Passwort', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page.getByRole('alert')).toContainText('Einladungscode ist ungültig');

  const code = await createInvite();
  await page.goto(`/#/registrieren/${code}`);
  await expect(page.getByLabel('Einladungscode')).toHaveValue(code);
  await page.getByLabel('Benutzername').fill(creds.username);
  await page.getByLabel('E-Mail').fill(creds.email);
  await page.getByLabel('Passwort', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Willkommen bei ATHLETIC' })).toBeVisible();
  // Name im Onboarding ist mit dem Benutzernamen vorbelegt
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.goto('/#/profil');
  await expect(page.getByTestId('account-username')).toHaveText(creds.username);
});

test('A4. Falsches Passwort wird gemeldet, Abmelden entfernt die Daten vom Gerät', async ({ page }) => {
  const creds = await skipOnboarding(page);
  await syncAndWait(page);
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs.filter((n) => n?.startsWith('athletic-u'))).toHaveLength(0);

  await loginViaForm(page, creds.username, 'falsches-passwort');
  await expect(page.getByRole('alert')).toContainText('stimmt nicht');
  await page.getByLabel('Passwort', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  // Daten (inkl. erledigtem Onboarding) kommen vom Server zurück
  await expect(page.getByTestId('today-card')).toBeVisible();
});

test('A5. Passwort vergessen: Link per E-Mail, neues Passwort gilt', async ({ browser }) => {
  const setupPage = await (await browser.newContext()).newPage();
  const creds = await skipOnboarding(setupPage);
  await syncAndWait(setupPage);

  const page = await (await browser.newContext()).newPage();
  await page.goto('/');
  await page.getByRole('link', { name: 'Passwort vergessen?' }).click();
  await page.getByLabel('Benutzername oder E-Mail').fill(creds.username);
  await page.getByRole('button', { name: 'Link anfordern' }).click();
  await expect(page.getByRole('status')).toContainText('E-Mail unterwegs');

  const mail = lastMailTo(creds.email);
  expect(mail?.subject).toContain('Passwort zurücksetzen');
  const link = mail!.text.match(/#\/passwort-neu\/[0-9a-f]{64}/)![0];
  await page.goto(`/${link}`);
  await page.getByLabel('Neues Passwort').fill('ganz-neues-passwort');
  await page.getByRole('button', { name: 'Passwort speichern' }).click();
  await expect(page.getByRole('status')).toContainText('Passwort ist geändert');

  // altes Gerät ist abgemeldet, altes Passwort gilt nicht mehr
  await setupPage.goto('/#/profil');
  await setupPage.getByRole('button', { name: 'Jetzt sichern' }).click();
  await expect(setupPage.getByText('Deine Anmeldung ist abgelaufen')).toBeVisible();

  await loginViaForm(page, creds.email, creds.password);
  await expect(page.getByRole('alert')).toContainText('stimmt nicht');
  await page.getByLabel('Passwort', { exact: true }).fill('ganz-neues-passwort');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByTestId('today-card')).toBeVisible();
});

test('A6. Abgelaufene Anmeldung: neu anmelden, Daten auf dem Gerät bleiben', async ({ page, context }) => {
  const creds = await skipOnboarding(page);
  await startWorkoutFromTraining(page);
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  await context.clearCookies();
  await page.goto('/#/profil');
  await page.getByRole('button', { name: 'Jetzt sichern' }).click();
  await expect(page.getByText('Deine Anmeldung ist abgelaufen')).toBeVisible();
  await expect(page.getByLabel('Benutzername oder E-Mail')).toHaveValue(creds.username);
  await page.getByLabel('Passwort', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  // zurück im Profil, das laufende Workout ist noch da
  await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible();
  await page.goto('/#/workout');
  await expect(page.getByTestId('done-set')).toHaveCount(1);
});

test('A7. Admin: Einladung in der App erstellen, Nutzerliste, normale Nutzer sehen das nicht', async ({ browser }) => {
  const user = await (await browser.newContext()).newPage();
  const creds = await signUp(user);
  await user.goto('/');
  await user.getByRole('button', { name: 'Überspringen' }).click();
  await user.goto('/#/profil');
  await expect(user.getByRole('link', { name: /Nutzer und Einladungen/ })).toHaveCount(0);
  await user.goto('/#/admin');
  await expect(user).toHaveURL(/#\/$/);

  const page = await (await browser.newContext()).newPage();
  await loginViaForm(page, ADMIN.username, ADMIN.password);
  const skip = page.getByRole('button', { name: 'Überspringen' });
  await expect(page.getByTestId('today-card').or(skip)).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await page.goto('/#/profil');
  await page.getByRole('link', { name: /Nutzer und Einladungen/ }).click();
  await expect(page.getByRole('heading', { name: 'Nutzer verwalten' })).toBeVisible();
  await expect(page.getByTestId('admin-users')).toContainText(creds.username);
  await page.getByLabel('Für wen? (optional)').fill('Max');
  await page.getByRole('button', { name: 'Einladung erstellen' }).click();
  await expect(page.getByTestId('invite-code')).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  await expect(page.getByRole('list', { name: 'Einladungen' })).toContainText('Max');
});
