import { test, expect } from '@playwright/test';
import {
  ensureTestUser,
  ensureSecondUser,
  cleanTestFollows,
  SECOND_USER_BSY_ID,
} from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let testUserId: string;
let secondUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
  const second = await ensureSecondUser();
  secondUserId = second.id;
});

test.beforeEach(async () => {
  await cleanTestFollows(testUserId);
});

test.describe('Follow', () => {
  test('can follow and unfollow a user from their profile', async ({ page }) => {
    await page.goto(`/profile?user=${secondUserId}`);

    await expect(page.getByText(SECOND_USER_BSY_ID).first()).toBeVisible({ timeout: 30_000 });

    const followButton = page.getByRole('button', { name: 'Seguir' });
    await expect(followButton).toBeVisible({ timeout: 15_000 });

    await followButton.click();
    await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Siguiendo' }).click();
    await expect(page.getByRole('button', { name: 'Seguir' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
