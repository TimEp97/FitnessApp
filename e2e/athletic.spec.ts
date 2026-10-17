import { expect, test } from '@playwright/test';
import { signUp, skipOnboarding, startWorkoutFromTraining } from './helpers';

test('1. Onboarding durchlaufen und Plan übernehmen', async ({ page }) => {
  await signUp(page);
  await page.goto('/');
  await page.getByLabel('Wie heißt du?').fill('Alex');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await page.getByRole('button', { name: /^Kraft/ }).click();
  await page.getByRole('button', { name: /^Fortgeschritten/ }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();

  await page.getByRole('group', { name: 'Trainingstage pro Woche' }).getByRole('button', { name: '4' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByTestId('plan-proposal')).toBeVisible();
  await expect(page.getByText('Vier-Tage-Split', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Plan übernehmen' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alex');
  await expect(page.getByTestId('today-card')).toContainText('Plan: Vier-Tage-Split');
  await expect(page.getByTestId('today-card').getByRole('heading')).toHaveText('Brust & Trizeps');
});

test('2. Workout starten, drei Sätze protokollieren, beenden, Zusammenfassung prüfen', async ({ page }) => {
  await skipOnboarding(page);
  await startWorkoutFromTraining(page);

  // Direkte Eingabe über die Zifferntastatur
  await page.getByTestId(/stepper-(Zusatzg|G)ewicht/).click();
  await page.getByRole('textbox', { name: /ewicht/ }).fill('22,5');
  await page.keyboard.press('Enter');
  await page.getByTestId('stepper-Wiederholungen').click();
  await page.getByRole('textbox', { name: 'Wiederholungen' }).fill('10');
  await page.keyboard.press('Enter');

  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('set-number')).toContainText(`Satz ${i}`);
    await page.getByRole('button', { name: 'Satz abschließen' }).click();
  }
  await expect(page.getByTestId('done-set')).toHaveCount(3);
  await expect(page.getByTestId('rest-timer')).toBeVisible();
  // Folgesatz ist mit denselben Werten vorbelegt
  await expect(page.getByTestId(/stepper-(Zusatzg|G)ewicht/)).toHaveText('22,5');

  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await page.getByRole('button', { name: 'Beenden und speichern' }).click();

  await expect(page).toHaveURL(/zusammenfassung/);
  await expect(page.getByTestId('summary-sets')).toHaveText('3');
  await expect(page.getByTestId('summary-exercises')).toHaveText('1');
  await expect(page.getByTestId('summary-volume')).toHaveText('675 kg');
  await page.getByRole('link', { name: 'Fertig' }).click();
  await expect(page.getByTestId('today-card')).toBeVisible();
});

test('3. Neu laden während des Workouts erhält den Stand', async ({ page }) => {
  await skipOnboarding(page);
  await startWorkoutFromTraining(page);
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  await page.getByRole('button', { name: 'Nächste Übung' }).click();
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  const name = await page.getByTestId('exercise-name').textContent();

  await page.reload();
  await expect(page.getByTestId('exercise-name')).toHaveText(name!);
  await expect(page.getByText('Übung 2 von')).toBeVisible();
  await expect(page.getByTestId('done-set')).toHaveCount(2);
  await expect(page.getByTestId('set-number')).toContainText('Satz 3');

  // Tab „Training“ führt bei laufendem Workout direkt zum Tracker
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: /Training/ }).click();
  await expect(page).toHaveURL(/#\/workout$/);
});

test('4. Zweiten Plan anlegen und aktiv schalten, Home zeigt den neuen Plantag', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/#/training');
  await page.getByRole('button', { name: 'Neuer Plan' }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: /Oberkörper \/ Unterkörper/ }).click();
  await expect(page).toHaveURL(/training\/plan\//);
  await page.getByLabel('Name des Plans').fill('Mein zweiter Plan');
  await page.getByRole('link', { name: 'Fertig' }).click();

  const card = page.getByRole('button', { name: /Mein zweiter Plan/ });
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByTestId('today-card')).toContainText('Plan: Mein zweiter Plan');
  await expect(page.getByTestId('today-card').getByRole('heading')).toHaveText('Oberkörper');
});

test('5. Vorschläge erscheinen erst nach dem Klick', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/#/training');
  await expect(page.getByTestId('suggestions')).toHaveCount(0);
  await expect(page.getByTestId('suggestion')).toHaveCount(0);
  await page.getByRole('button', { name: 'Übungen vorschlagen' }).click();
  await expect(page.getByTestId('suggestions')).toBeVisible();
  const items = page.getByTestId('suggestion');
  expect(await items.count()).toBeGreaterThan(0);
  expect(await items.count()).toBeLessThanOrEqual(3);

  const plus = items.first().getByRole('button');
  await plus.click();
  await expect(plus).toHaveAttribute('aria-pressed', 'true');
  await plus.click();
  await expect(plus).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Ausblenden' }).click();
  await expect(page.getByTestId('suggestions')).toHaveCount(0);

  // Gewichtsvorschlag im Workout ebenso nur auf Klick
  await startWorkoutFromTraining(page);
  await expect(page.getByTestId('weight-suggestion')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gewichtsvorschlag anzeigen' }).click();
  await expect(page.getByTestId('weight-suggestion')).toContainText('Vorschlag');
});

test('6. Beispieldaten entfernen, alle Screens zeigen Leerzustände', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByTestId('sample-badge')).toBeVisible();
  await page.goto('/#/profil');
  await page.getByRole('button', { name: 'Beispieldaten entfernen' }).click();
  await page.getByRole('button', { name: 'Entfernen, auch die Pläne' }).click();
  await expect(page.getByRole('button', { name: 'Beispieldaten entfernen' })).toHaveCount(0);

  for (const path of ['/', '/training', '/muskeln', '/fortschritt']) {
    await page.goto(`/#${path}`);
    await expect(page.getByTestId('empty-state').first(), path).toBeVisible();
    await expect(page.getByTestId('sample-badge')).toHaveCount(0);
  }
  await page.goto('/#/');
  await expect(page.getByText('Lege deinen ersten Plan an')).toBeVisible();
});

test('7. Einzelnes Training löschen fragt zweimal nach', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/#/fortschritt');
  const rows = page.getByTestId('workout-history').getByRole('listitem');
  const before = await rows.count();
  expect(before).toBeGreaterThan(1);

  // erste Rückfrage abbrechen: nichts passiert
  await rows.first().getByRole('button', { name: /löschen$/ }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('dialog', { name: 'Wirklich löschen?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await expect(rows).toHaveCount(before);

  // beide Rückfragen bestätigen
  await rows.first().getByRole('button', { name: /löschen$/ }).click();
  await expect(page.getByRole('dialog', { name: 'Training löschen?' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Ja, Training löschen' }).click();
  await expect(rows).toHaveCount(before - 1);

  // auch aus der Zusammenfassung heraus
  await rows.first().getByRole('link').click();
  await expect(page).toHaveURL(/zusammenfassung/);
  await page.getByRole('button', { name: 'Training löschen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Ja, Training löschen' }).click();
  await expect(page).toHaveURL(/#\/fortschritt$/);
  await expect(rows).toHaveCount(before - 2);

  await page.reload();
  await expect(page.getByTestId('workout-history').getByRole('listitem')).toHaveCount(before - 2);
});

test('8. Alles zurücksetzen fragt zweimal nach und startet neu', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/#/fortschritt');
  await page.getByRole('button', { name: 'Alles zurücksetzen' }).click();
  await expect(page.getByRole('dialog', { name: 'Alles zurücksetzen?' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('dialog', { name: 'Wirklich alles löschen?' })).toBeVisible();
  await page.getByRole('button', { name: 'Ja, endgültig zurücksetzen' }).click();

  await expect(page.getByRole('heading', { name: 'Willkommen bei ATHLETIC' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Willkommen bei ATHLETIC' })).toBeVisible();
});

test('10. Fortschritt in Prozent, nach der letzten Übung direkt beenden', async ({ page }) => {
  await skipOnboarding(page);
  await startWorkoutFromTraining(page);
  await expect(page.getByTestId('workout-progress')).toContainText('0 % geschafft');
  await expect(page.getByTestId('finish-now')).toHaveCount(0);

  await page.getByTestId(/stepper-(Zusatzg|G)ewicht/).click();
  await page.getByRole('textbox', { name: /ewicht/ }).fill('20');
  await page.keyboard.press('Enter');
  await page.getByTestId('stepper-Wiederholungen').click();
  await page.getByRole('textbox', { name: 'Wiederholungen' }).fill('10');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Satz abschließen' }).click();
  await expect(page.getByTestId('workout-progress')).not.toContainText('0 % geschafft');

  // zur letzten Übung springen und deren Sätze abschließen
  await page.getByRole('button', { name: 'Übungsliste öffnen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Sätze/ }).last().click();
  await expect(page.getByText(/^Übung (\d+) von \1$/)).toBeVisible();
  const target = Number((await page.getByTestId('set-number').innerText()).match(/von (\d+)/)![1]);
  for (let i = 0; i < target; i++) {
    await expect(page.getByTestId('finish-now')).toHaveCount(0);
    await page.getByTestId(/stepper-(Zusatzg|G)ewicht/).click();
    await page.getByRole('textbox', { name: /ewicht/ }).fill('20');
    await page.keyboard.press('Enter');
    await page.getByTestId('stepper-Wiederholungen').click();
    await page.getByRole('textbox', { name: 'Wiederholungen' }).fill('10');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Satz abschließen' }).click();
  }
  await expect(page.getByText('Letzte Übung geschafft!')).toBeVisible();
  await page.screenshot({ path: 'test-results/finish.png', fullPage: true });
  await page.getByTestId('finish-now').click();
  await expect(page).toHaveURL(/zusammenfassung/);
  await expect(page.getByTestId('summary-sets')).toHaveText(String(target + 1));
});

test('9. Kein seitliches Scrollen bei 320 und 390 px', async ({ browser }) => {
  for (const width of [320, 390]) {
    const page = await (await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true })).newPage();
    await skipOnboarding(page);
    await startWorkoutFromTraining(page);
    await page.getByRole('button', { name: 'Satz abschließen' }).click();
    const routes = ['/', '/workout', '/training', '/muskeln', '/fortschritt', '/profil', '/uebungen', '/uebungen/bulgarian-split-squat'];
    for (const path of routes) {
      await page.goto(`/#${path}`);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} bei ${width} px`).toBeLessThanOrEqual(0);
    }
  }
});
