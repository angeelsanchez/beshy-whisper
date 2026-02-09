import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
  test('shows own profile with user info', async ({ page }) => {
    await page.goto('/profile');

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    await expect(page.getByText('BSY999').first()).toBeVisible({ timeout: 15_000 });
  });

  test('can open edit form and modify bio', async ({ page }) => {
    await page.goto('/profile');

    await page.waitForFunction(
      () => document.querySelector('nav')?.textContent?.includes('Perfil'),
      { timeout: 30_000 },
    );

    await expect(page.getByText('BSY999').first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Editar perfil' }).click();

    const bioInput = page.locator('#bio-input');
    await expect(bioInput).toBeVisible({ timeout: 10_000 });

    const newBio = `E2E bio ${Date.now()}`;
    await bioInput.fill(newBio);

    const saveButton = page.getByRole('button', { name: 'Guardar' });
    await expect(saveButton).toBeVisible({ timeout: 5_000 });
    await expect(saveButton).toBeEnabled({ timeout: 3_000 });

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/user/update-bio') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      saveButton.click(),
    ]);

    expect(response.status()).toBe(200);

    await expect(page.getByText('Bio actualizada')).toBeVisible({ timeout: 10_000 });
  });
});
