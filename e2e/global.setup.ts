import { test as setup, expect } from '@playwright/test';
import { ensureTestUser, ensureSecondUser, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './utils/db-helpers';
import { mockRecaptcha } from './utils/recaptcha-mock';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const AUTH_FILE = 'e2e/.auth/user.json';

setup('create test users and authenticate', async ({ page }) => {
  await ensureTestUser();
  await ensureSecondUser();

  await mockRecaptcha(page);

  await page.goto('/login');

  await page.waitForFunction(() => 'grecaptcha' in window, { timeout: 10_000 });

  await page.getByLabel('Email').fill(TEST_USER_EMAIL);
  await page.getByLabel('Contrasena').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 20_000, waitUntil: 'commit' },
  );

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name.includes('next-auth.session-token'));
  expect(sessionCookie, 'Session cookie should exist after login').toBeTruthy();

  await page.context().storageState({ path: AUTH_FILE });
});
