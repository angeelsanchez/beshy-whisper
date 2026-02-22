import { test, expect } from '@playwright/test';
import {
  ensureTestUser,
  ensureSecondUser,
  seedEntry,
  cleanTestEntries,
  cleanTestLikes,
} from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

test.describe.configure({ mode: 'serial' });

let testUserId: string;
let secondUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
  const second = await ensureSecondUser();
  secondUserId = second.id;
});

test.describe('Feed', () => {
  test('shows feed page with entries', async ({ page }) => {
    await cleanTestEntries(secondUserId);
    await seedEntry(secondUserId, { message: 'Visible whisper from E2E' });

    await page.goto('/feed');

    await expect(page.getByText('Visible whisper from E2E')).toBeVisible({ timeout: 15_000 });
  });

  test('can like and unlike an entry', async ({ page }) => {
    await cleanTestLikes(testUserId);
    await cleanTestEntries(secondUserId);
    await seedEntry(secondUserId, { message: 'Likeable whisper' });

    await page.goto('/feed');
    await expect(page.getByText('Likeable whisper')).toBeVisible({ timeout: 15_000 });

    const entryArticle = page.locator('article', { hasText: 'Likeable whisper' });
    const likeButton = entryArticle.getByRole('button', { name: /me gusta/i });
    await expect(likeButton).toBeEnabled({ timeout: 20_000 });

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/likes') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      likeButton.click(),
    ]);

    await expect(likeButton).toHaveAttribute('aria-label', 'Quitar me gusta', { timeout: 15_000 });

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/likes') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      likeButton.click(),
    ]);

    await expect(likeButton).toHaveAttribute('aria-label', 'Dar me gusta', { timeout: 15_000 });
  });
});
