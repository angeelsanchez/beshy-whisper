import { test, expect } from '@playwright/test';
import { ensureTestUser, cleanTestEntries, seedEntry } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.describe('Duplicate Whisper Prevention', () => {
  test('cannot create two whispers in the same franja', async ({ page }) => {
    await cleanTestEntries(testUserId);

    // Determine current franja based on local time
    const hour = new Date().getHours();
    const franja = hour >= 6 && hour < 18 ? 'DIA' : 'NOCHE';

    // Seed an existing entry for the current franja
    await seedEntry(testUserId, { franja, message: 'First whisper of the day' });

    await page.goto('/create');
    await page.locator('#whisper-textarea').waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('#whisper-textarea').fill('Second whisper attempt');

    const submitButton = page.getByRole('button', { name: /guardar susurro/i });

    // Wait for the button to be enabled (it might be disabled initially while loading status)
    // Then click it
    try {
      await submitButton.click({ timeout: 10_000 });
    } catch {
      // Button might stay disabled if the frontend detects the existing post
      // That's also a valid outcome - the UI prevents the action
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        // Frontend correctly prevents submission - test passes
        return;
      }
      throw new Error('Submit button not clickable');
    }

    // If the button was clicked, the API should return a 409 error
    // or the frontend should show an error message
    await expect(
      page.getByText(/ya has publicado/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('can create whispers in different franjas', async ({ page }) => {
    await cleanTestEntries(testUserId);

    // Seed an entry in the opposite franja
    const hour = new Date().getHours();
    const currentFranja = hour >= 6 && hour < 18 ? 'DIA' : 'NOCHE';
    const oppositeFranja = currentFranja === 'DIA' ? 'NOCHE' : 'DIA';

    await seedEntry(testUserId, { franja: oppositeFranja, message: 'Other franja whisper' });

    await page.goto('/create');
    await page.locator('#whisper-textarea').waitFor({ state: 'visible', timeout: 15_000 });

    const whisperText = `E2E different franja ${Date.now()}`;
    await page.locator('#whisper-textarea').fill(whisperText);

    const submitButton = page.getByRole('button', { name: /guardar susurro/i });
    await expect(submitButton).toBeEnabled({ timeout: 5_000 });

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/posts/create') && resp.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      submitButton.click(),
    ]);

    expect(response.status()).toBe(201);
  });
});
