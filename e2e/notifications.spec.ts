import { test, expect } from '@playwright/test';
import { ensureTestUser, cleanTestNotificationPreferences } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.beforeEach(async () => {
  await cleanTestNotificationPreferences(testUserId);
});

test.describe('Notification Preferences', () => {
  test('can open notification preferences panel from profile', async ({ page }) => {
    await page.goto('/profile');

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    const notifButton = page.getByRole('button', { name: 'Configurar notificaciones' });
    await expect(notifButton).toBeVisible({ timeout: 15_000 });
    await notifButton.click();

    await expect(page.getByText('Social', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Recordatorios', { exact: true })).toBeVisible();
    await expect(page.getByText('Iniciativas', { exact: true })).toBeVisible();
    await expect(page.getByText('Logros', { exact: true })).toBeVisible();
  });

  test('can toggle a notification category off and back on', async ({ page }) => {
    await page.goto('/profile');

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    await page.getByRole('button', { name: 'Configurar notificaciones' }).click();

    await expect(page.getByText('Social')).toBeVisible({ timeout: 10_000 });

    const socialSection = page.locator('div', { hasText: 'Interacciones con otros usuarios' }).first();
    const categoryToggle = socialSection.getByRole('switch').first();

    await expect(categoryToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });

    const [disableResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/user/notification-preferences') && resp.request().method() === 'PUT',
        { timeout: 15_000 },
      ),
      categoryToggle.click(),
    ]);

    expect(disableResponse.status()).toBe(200);
    await expect(categoryToggle).toHaveAttribute('aria-checked', 'false', { timeout: 5_000 });

    const [enableResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/user/notification-preferences') && resp.request().method() === 'PUT',
        { timeout: 15_000 },
      ),
      categoryToggle.click(),
    ]);

    expect(enableResponse.status()).toBe(200);
    await expect(categoryToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });
  });

  test('toggling category persists after page reload', async ({ page }) => {
    await page.goto('/profile');

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    await page.getByRole('button', { name: 'Configurar notificaciones' }).click();
    await expect(page.getByText('Social')).toBeVisible({ timeout: 10_000 });

    const socialSection = page.locator('div', { hasText: 'Interacciones con otros usuarios' }).first();
    const categoryToggle = socialSection.getByRole('switch').first();

    await expect(categoryToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/user/notification-preferences') && resp.request().method() === 'PUT',
        { timeout: 15_000 },
      ),
      categoryToggle.click(),
    ]);

    await expect(categoryToggle).toHaveAttribute('aria-checked', 'false', { timeout: 5_000 });

    await page.reload();

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    await page.getByRole('button', { name: 'Configurar notificaciones' }).click();
    await expect(page.getByText('Social')).toBeVisible({ timeout: 10_000 });

    const socialSectionAfter = page.locator('div', { hasText: 'Interacciones con otros usuarios' }).first();
    const toggleAfter = socialSectionAfter.getByRole('switch').first();

    await expect(toggleAfter).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 });
  });
});
