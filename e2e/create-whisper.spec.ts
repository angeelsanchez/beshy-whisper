import { test, expect } from '@playwright/test';
import { ensureTestUser, cleanTestEntries } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.beforeEach(async () => {
  await cleanTestEntries(testUserId);
});

test.describe('Create Whisper', () => {
  test('can create a whisper and see it in feed', async ({ page }) => {
    await cleanTestEntries(testUserId);

    await page.goto('/create');

    const whisperText = `E2E whisper ${Date.now()}`;

    await page.locator('#whisper-textarea').waitFor({ state: 'visible', timeout: 15_000 });
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

    await page.goto('/feed');

    await expect(page.getByText(whisperText)).toBeVisible({ timeout: 15_000 });
  });

  test('shows disabled button when whisper is empty', async ({ page }) => {
    await page.goto('/create');

    await page.locator('#whisper-textarea').waitFor({ state: 'visible', timeout: 15_000 });

    await expect(page.getByRole('button', { name: /guardar susurro/i })).toBeDisabled();
  });
});
