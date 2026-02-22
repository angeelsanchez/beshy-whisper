import { test, expect } from '@playwright/test';
import { mockRecaptcha } from './utils/recaptcha-mock';
import { cleanRegisterTestUser, REGISTER_TEST_EMAIL } from './utils/db-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const REGISTER_PASSWORD = 'E2eTestPass1!';

test.beforeEach(async () => {
  await cleanRegisterTestUser();
});

test.afterAll(async () => {
  await cleanRegisterTestUser();
});

test.describe('User Registration', () => {
  test('successful registration with email and password', async ({ page }) => {
    await mockRecaptcha(page);

    await page.goto('/login');
    await page.getByRole('tab', { name: 'Registrar' }).click();

    await page.waitForFunction(() => 'grecaptcha' in window, { timeout: 10_000 });

    await page.getByLabel('Email').fill(REGISTER_TEST_EMAIL);
    await page.getByLabel('Contrasena', { exact: false }).first().fill(REGISTER_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(REGISTER_PASSWORD);
    await page.getByLabel('Nombre (opcional)').fill('E2E Register');

    await page.getByRole('button', { name: 'Registrar' }).click();

    // Should show success message with BSY ID
    await expect(page.getByText(/Registro exitoso/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/BSY\d+/)).toBeVisible();
  });

  test('duplicate email shows error', async ({ page }) => {
    await mockRecaptcha(page);

    await page.goto('/login');
    await page.getByRole('tab', { name: 'Registrar' }).click();
    await page.waitForFunction(() => 'grecaptcha' in window, { timeout: 10_000 });

    // First registration
    await page.getByLabel('Email').fill(REGISTER_TEST_EMAIL);
    await page.getByLabel('Contrasena', { exact: false }).first().fill(REGISTER_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(REGISTER_PASSWORD);
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText(/Registro exitoso/)).toBeVisible({ timeout: 15_000 });

    // Second registration with same email
    await page.getByRole('tab', { name: 'Registrar' }).click();
    await page.getByLabel('Email').fill(REGISTER_TEST_EMAIL);
    await page.getByLabel('Contrasena', { exact: false }).first().fill(REGISTER_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(REGISTER_PASSWORD);
    await page.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.locator('#form-error')).toBeVisible({ timeout: 10_000 });
  });

  test('weak password shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Registrar' }).click();

    await page.getByLabel('Email').fill('weak-pass@beshy.es');
    await page.getByLabel('Contrasena', { exact: false }).first().fill('weak');
    await page.getByLabel('Confirmar contraseña').fill('weak');
    await page.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.locator('#form-error')).toBeVisible({ timeout: 5_000 });
  });

  test('mismatched passwords shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Registrar' }).click();

    await page.getByLabel('Email').fill('mismatch@beshy.es');
    await page.getByLabel('Contrasena', { exact: false }).first().fill(REGISTER_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill('DifferentPass1!');
    await page.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.locator('#form-error')).toBeVisible({ timeout: 5_000 });
  });

  test('can login after registration', async ({ page }) => {
    await mockRecaptcha(page);

    await page.goto('/login');
    await page.getByRole('tab', { name: 'Registrar' }).click();
    await page.waitForFunction(() => 'grecaptcha' in window, { timeout: 10_000 });

    // Register
    await page.getByLabel('Email').fill(REGISTER_TEST_EMAIL);
    await page.getByLabel('Contrasena', { exact: false }).first().fill(REGISTER_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(REGISTER_PASSWORD);
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText(/Registro exitoso/)).toBeVisible({ timeout: 15_000 });

    // Login with newly created credentials
    await page.getByLabel('Email').fill(REGISTER_TEST_EMAIL);
    await page.getByLabel('Contrasena').fill(REGISTER_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL(
      (url) => !url.pathname.startsWith('/login'),
      { timeout: 20_000, waitUntil: 'commit' },
    );
  });
});
