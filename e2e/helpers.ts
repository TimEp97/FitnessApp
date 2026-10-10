import { expect, type Page } from '@playwright/test';

/** Erster Start: Onboarding überspringen, Beispieldaten bleiben. */
export async function skipOnboarding(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Willkommen bei ATHLETIC' })).toBeVisible();
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(page.getByTestId('today-card')).toBeVisible();
}

export async function startWorkoutFromTraining(page: Page) {
  await page.goto('/#/training');
  await page.getByRole('button', { name: 'Workout starten' }).click();
  await expect(page).toHaveURL(/#\/workout$/);
  await expect(page.getByTestId('exercise-name')).toBeVisible();
}
