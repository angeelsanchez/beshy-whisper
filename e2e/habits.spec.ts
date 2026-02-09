import { test, expect } from '@playwright/test';
import { ensureTestUser, cleanTestHabits } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.beforeEach(async () => {
  await cleanTestHabits(testUserId);
});

test.describe('Habits', () => {
  test('shows habits page', async ({ page }) => {
    await page.goto('/habits');

    await expect(page).toHaveURL('/habits');
    await expect(page.getByRole('button', { name: 'Nuevo hábito' })).toBeVisible({ timeout: 15_000 });
  });

  test('can create a new habit via wizard', async ({ page }) => {
    await page.goto('/habits');

    const newHabitBtn = page.getByRole('button', { name: 'Nuevo hábito' });
    await expect(newHabitBtn).toBeVisible({ timeout: 15_000 });
    await newHabitBtn.click();

    const customBtn = page.getByRole('button', { name: 'Crear personalizado' });
    await expect(customBtn).toBeVisible({ timeout: 15_000 });
    await customBtn.click();

    const nameInput = page.locator('input[placeholder="Ej: Leer 20 minutos"]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill('E2E Test Habit');

    await page.getByRole('button', { name: 'Siguiente' }).click();

    await page.getByRole('button', { name: 'Crear hábito' }).click({ timeout: 10_000 });

    await page.waitForURL('**/habits', { timeout: 15_000, waitUntil: 'commit' });

    await expect(page.getByText('E2E Test Habit')).toBeVisible({ timeout: 10_000 });
  });
});
