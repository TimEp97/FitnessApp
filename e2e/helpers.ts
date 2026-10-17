import { readFileSync } from 'node:fs';
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';

export const BASE_URL = 'http://127.0.0.1:4173';
export const SETUP_CODE = 'e2e-setup-code-0123456789';
export const MAIL_LOG = '.e2e-site/api/data/mail.log';
export const API_HEADERS = { 'X-Athletic': '1' };
export const ADMIN = { username: 'admin', email: 'admin@example.test', password: 'admin-passwort-123' };

let adminContext: Promise<APIRequestContext> | null = null;

/** Angemeldete Admin-Verbindung zur Schnittstelle; legt beim ersten Mal das Admin-Konto an. */
export function asAdmin(): Promise<APIRequestContext> {
  adminContext ??= (async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: API_HEADERS });
    const status = await (await ctx.get('/api/auth.php?action=status')).json();
    if (status.setupNeeded && (await ctx.post('/api/auth.php?action=setup', { data: { ...ADMIN, code: SETUP_CODE } })).ok()) return ctx;
    // schon eingerichtet (anderer Test-Worker): anmelden
    const res = await ctx.post('/api/auth.php?action=login', { data: { login: ADMIN.username, password: ADMIN.password } });
    expect(res.ok(), 'Admin-Anmeldung').toBeTruthy();
    return ctx;
  })();
  return adminContext;
}

export async function createInvite(): Promise<string> {
  const res = await (await asAdmin()).post('/api/auth.php?action=admin_invite_create', { data: { note: 'e2e' } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).invite.code;
}

let counter = 0;
export function newCredentials() {
  const id = `${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1000)}`;
  return { username: `u${id}`.slice(0, 24), email: `u${id}@example.test`, password: 'test-passwort-123' };
}

/**
 * Legt ein neues Konto an und meldet den Browser an (über die Schnittstelle, ohne Formular).
 * Der Nutzer wird nur beim ersten Laden des Tabs gesetzt, damit Abmelden im Test wirkt.
 */
export async function signUp(page: Page) {
  const creds = newCredentials();
  const invite = await createInvite();
  const res = await page.request.post('/api/auth.php?action=register', { headers: API_HEADERS, data: { ...creds, invite } });
  expect(res.ok(), 'Registrierung').toBeTruthy();
  const { user } = await res.json();
  await page.addInitScript((u) => {
    if (sessionStorage.getItem('e2e-signed-in')) return;
    sessionStorage.setItem('e2e-signed-in', '1');
    localStorage.setItem('athletic-user', JSON.stringify(u));
  }, user);
  return creds;
}

/** Neues Konto, Onboarding überspringen, Beispieldaten bleiben. */
export async function skipOnboarding(page: Page) {
  const creds = await signUp(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Willkommen bei ATHLETIC' })).toBeVisible();
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(page.getByTestId('today-card')).toBeVisible();
  return creds;
}

/** Anmelden über das Formular. */
export async function loginViaForm(page: Page, login: string, password: string) {
  await page.goto('/');
  await page.getByLabel('Benutzername oder E-Mail').fill(login);
  await page.getByLabel('Passwort', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

export async function syncAndWait(page: Page) {
  await page.goto('/#/profil');
  await page.getByRole('button', { name: 'Jetzt sichern' }).click();
  await expect(page.getByTestId('sync-status')).toContainText('Gesichert', { timeout: 15_000 });
}

/** Letzte Mail an diese Adresse aus der Mail-Logdatei des Testservers. */
export function lastMailTo(email: string): { subject: string; text: string } | undefined {
  let lines: string[] = [];
  try {
    lines = readFileSync(MAIL_LOG, 'utf8').trim().split('\n');
  } catch {
    return undefined;
  }
  return lines
    .map((l) => JSON.parse(l) as { to: string; subject: string; text: string })
    .filter((m) => m.to === email)
    .pop();
}

export async function startWorkoutFromTraining(page: Page) {
  await page.goto('/#/training');
  await page.getByRole('button', { name: 'Workout starten' }).click();
  await expect(page).toHaveURL(/#\/workout$/);
  await expect(page.getByTestId('exercise-name')).toBeVisible();
}
