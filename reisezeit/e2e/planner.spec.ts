import { expect, test } from '@playwright/test';

// Durchlauf: Start → März → Thailand → „Reise hierhin planen“ → 3 Vorlieben → „Reiseplan erstellen“
// → Plan mit Karte, Tagesablauf und Einreise-Infos → Verkehrsmittel anpassen → PDF wird heruntergeladen
test('von drei Fragen zum PDF-Reiseplan', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('group', { name: 'Wann willst du reisen?' }).getByRole('button', { name: 'Mär' }).click();
  await expect(page.getByText(/Länder mit guter Reisezeit im März/)).toBeVisible();

  await page.getByRole('link', { name: 'Thailand öffnen' }).click();
  await expect(page.getByRole('heading', { name: 'Thailand', level: 1 })).toBeVisible();
  await expect(page.getByText('März · Beste Zeit').first()).toBeVisible();
  // Einreise-Infos für Deutsche
  const facts = page.getByRole('region', { name: 'Einreise und Wichtiges für Thailand' });
  await expect(facts).toContainText('Visumfrei');
  await expect(facts).toContainText('bis 60 Tage');

  await page.getByRole('link', { name: 'Reise hierhin planen' }).click();
  await expect(page.getByRole('heading', { name: 'Deine Reise in drei Fragen' })).toBeVisible();
  for (const name of ['Strand', 'Kultur & Geschichte', 'Streetfood & Kochen']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  // Ein Klick: der Reiseplan entsteht automatisch
  await page.getByRole('button', { name: 'Reiseplan erstellen' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Reiseplan' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Karte der Route/ })).toBeVisible();
  const timeline = page.getByRole('list', { name: 'Tagesablauf' });
  await expect(timeline.locator('img')).toHaveCount(4);
  await expect(timeline).toContainText('Tag 14: Rückreise');
  await expect(page.getByRole('region', { name: 'Einreise und Wichtiges für Thailand' })).toBeVisible();

  // Optional anpassen: Verkehrsmittel der ersten Strecke ändern
  await page.getByRole('group', { name: 'Reiseplan anpassen' }).getByRole('button', { name: 'Verkehrsmittel' }).click();
  const radios = page.getByRole('radiogroup').first().getByRole('radio');
  const states = await radios.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')));
  const unchecked = radios.nth(states.indexOf('false'));
  const label = (await unchecked.locator('span span').first().textContent())!;
  await unchecked.click();
  await expect(unchecked).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Zum Reiseplan' }).click();
  await expect(timeline).toContainText(`Tag 4: ${label}`);

  // Auswahl bleibt nach Neuladen erhalten
  await page.reload();
  await expect(timeline).toContainText(`Tag 4: ${label}`);

  // PDF wird automatisch erstellt und heruntergeladen
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('link', { name: 'PDF herunterladen' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toBe('Reiseplan_Thailand_Maerz.pdf');
  await expect(page.getByRole('heading', { name: 'Tagesplan & Verbindungen' })).toBeVisible();
  expect(await page.locator('.sheet').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByText(/liegt in deinen Downloads/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Reiseprofil: Punkte, Auszeichnungen und Vergleich', async ({ page }) => {
  await page.goto('/#/profil');
  await page.getByLabel('Dein Name (für den Vergleich)').fill('Tim');
  await page.getByLabel('Land suchen').fill('Thai');
  await page.getByRole('button', { name: 'Thailand', exact: true }).click();
  await page.getByLabel('Land suchen').fill('Itali');
  await page.getByRole('button', { name: 'Italien', exact: true }).click();
  // 2 Länder × 10 + 2 Kontinente × 25 + 5 Bonus für das erste Abzeichen
  await expect(page.getByRole('img', { name: /Stufe Urlauber, 75 Punkte/ })).toBeVisible();
  await expect(page.locator('.badge.earned')).toHaveCount(1);
  await expect(page.locator('.badge.earned')).toContainText('Erste Reise');
  // Glückwunsch-Meldung, Weltkarte und nächste Ziele
  await expect(page.locator('.toast').first()).toContainText('Neues Abzeichen: Erste Reise');
  await expect(page.getByRole('img', { name: 'Weltkarte: 2 Länder bereist' })).toBeVisible();
  await expect(page.locator('.worldmap .land.mine')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Deine nächsten Ziele' })).toBeVisible();

  // Profil eines Freundes per Link vergleichen und in die Rangliste nehmen
  await page.goto('/#/vergleich/p1.QW5uYQ.DEFRITJPTHUS.bkk');
  await expect(page.getByRole('heading', { name: 'Tim und Anna' })).toBeVisible();
  await expect(page.locator('.worldmap .land.both')).toHaveCount(2);
  await expect(page.getByText(/Anna liegt \d+ Punkte vorn/)).toBeVisible();
  await page.getByRole('button', { name: 'Zur Rangliste hinzufügen' }).click();
  await page.getByRole('link', { name: 'Mein Profil' }).click();
  const board = page.locator('.board li');
  await expect(board).toHaveCount(2);
  await expect(board.first()).toContainText('Anna');
  await expect(board.nth(1)).toContainText('Tim (du)');
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
  for (const url of ['/', '/#/land/th', '/#/planer', '/#/profil']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  }
});

test('Handy: Tab-Leiste unten, Desktop: Navigation im Kopf', async ({ page, isMobile }) => {
  await page.goto('/');
  const tabbar = page.getByRole('navigation', { name: 'Hauptnavigation (mobil)' });
  const desk = page.getByRole('navigation', { name: 'Hauptnavigation', exact: true });
  if (isMobile) {
    await expect(tabbar).toBeVisible();
    await expect(desk).toBeHidden();
    await tabbar.getByRole('link', { name: 'Reise planen' }).click();
  } else {
    await expect(desk).toBeVisible();
    await expect(tabbar).toBeHidden();
    // Filter stehen auf dem Desktop neben den Kacheln
    const filters = await page.getByRole('complementary', { name: 'Filter' }).boundingBox();
    const grid = await page.locator('.grid-cards').boundingBox();
    expect(filters!.x + filters!.width).toBeLessThan(grid!.x);
    await desk.getByRole('link', { name: 'Reise planen' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Deine Reise in drei Fragen' })).toBeVisible();
});
