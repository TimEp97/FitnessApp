import { expect, test } from '@playwright/test';

// Durchlauf: Start → März → Thailand → „Reise hierhin planen“ → 3 Vorlieben → Route automatisch
// → Verkehrsmittel ändern → Reiseplan mit Karte und Tagesablauf → Druckansicht
test('vom Monat zum druckfertigen Reiseplan', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('group', { name: 'Wann willst du reisen?' }).getByRole('button', { name: 'Mär' }).click();
  await expect(page.getByText(/Länder mit guter Reisezeit im März/)).toBeVisible();

  await page.getByRole('link', { name: 'Thailand öffnen' }).click();
  await expect(page.getByRole('heading', { name: 'Thailand', level: 1 })).toBeVisible();
  await expect(page.getByText('März · Beste Zeit').first()).toBeVisible();

  await page.getByRole('link', { name: 'Reise hierhin planen' }).click();
  await expect(page.getByRole('heading', { name: 'Was magst du?' })).toBeVisible();
  for (const name of ['Strand', 'Kultur & Geschichte', 'Streetfood & Kochen']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Route automatisch vorschlagen' }).click();

  await expect(page.getByRole('heading', { name: 'Wohin geht die Reise?' })).toBeVisible();
  await expect(page.getByText(/Deine Route · 4 Stopps · 13 Nächte/)).toBeVisible();
  await page.getByRole('button', { name: /Weiter: Wie reist du/ }).click();

  const firstLeg = page.getByRole('radiogroup').first();
  const radios = firstLeg.getByRole('radio');
  const states = await radios.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')));
  const unchecked = radios.nth(states.indexOf('false'));
  const label = (await unchecked.locator('span span').first().textContent())!;
  await unchecked.click();
  await expect(unchecked).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: /Reiseplan erstellen/ }).click();
  await expect(page.getByRole('heading', { name: 'Dein Reiseplan' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Karte der Route/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Tagesablauf' })).toContainText(`Tag 4: ${label}`);

  // Auswahl bleibt nach Neuladen erhalten
  await page.reload();
  await expect(page.getByRole('list', { name: 'Tagesablauf' })).toContainText(`Tag 4: ${label}`);

  await page.getByRole('link', { name: /Als PDF exportieren/ }).click();
  await expect(page.getByRole('heading', { name: 'Tagesplan & Verbindungen' })).toBeVisible();
  await expect(page.locator('.sheet tbody tr')).toHaveCount(8);
  expect(errors).toEqual([]);
});

test('geteilter Link öffnet denselben Plan', async ({ page }) => {
  await page.goto('/#/plan/m2.d14.bkk3-cnx3-kbv3-lnt4.z-f-s');
  await expect(page.getByRole('heading', { name: 'Bangkok bis Koh Lanta' })).toBeVisible();
  const tl = page.getByRole('list', { name: 'Tagesablauf' });
  await expect(tl).toContainText('Tag 4: Nachtzug nach Chiang Mai');
  await expect(tl).toContainText('Tag 7: Flug nach Krabi');
  await page.getByRole('button', { name: 'In meinen Planer übernehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Reiseplan' })).toBeVisible();
});

test('bedienbar auf 360 px ohne seitliches Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const url of ['/', '/#/land/th', '/#/planer']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  }
});
