import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './utils/db-helpers';
import { mockRecaptcha } from './utils/recaptcha-mock';

test.describe('Authentication', () => {
  test('login with valid credentials redirects to feed', async ({ page }) => {
    await mockRecaptcha(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill(TEST_USER_EMAIL);
    await page.getByLabel('Contrasena').fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000, waitUntil: 'commit' });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await mockRecaptcha(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill(TEST_USER_EMAIL);
    await page.getByLabel('Contrasena').fill('WrongPassword999!');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });

  test('register tab shows additional fields', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('tab', { name: 'Registrar' }).click();

    await expect(page.getByLabel('Confirmar contraseña')).toBeVisible();
    await expect(page.getByLabel('Nombre (opcional)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar' })).toBeVisible();
  });
});
