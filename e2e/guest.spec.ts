import { test, expect } from '@playwright/test';
import { mockRecaptcha } from './utils/recaptcha-mock';

test.describe('Guest mode', () => {
  test('can enter guest mode with a name', async ({ page }) => {
    await mockRecaptcha(page);
    await page.goto('/guest');

    await expect(page.getByRole('heading', { name: 'Modo Invitado' })).toBeVisible();

    await page.getByLabel('Tu Nombre').fill('Invitado E2E');
    await page.getByRole('button', { name: 'Continuar como Invitado' }).click();

    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('guest mode shows validation when name is empty', async ({ page }) => {
    await mockRecaptcha(page);
    await page.goto('/guest');

    const nameInput = page.getByLabel('Tu Nombre');
    await expect(nameInput).toBeVisible();

    await page.getByRole('button', { name: 'Continuar como Invitado' }).click();

    const validationMessage = await nameInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage).toBeTruthy();
  });

  test('guest tab on login page navigates to guest page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('tab', { name: 'Invitado' }).click();

    await page.waitForURL('/guest', { timeout: 10_000 });
  });
});
