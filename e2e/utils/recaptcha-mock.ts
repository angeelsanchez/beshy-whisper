import type { Page } from '@playwright/test';

const MOCK_SCRIPT = `
  window.grecaptcha = {
    ready: function(cb) { if (cb) cb(); },
    execute: function() { return Promise.resolve('mock-recaptcha-token'); },
    render: function() { return 0; },
    getResponse: function() { return 'mock-recaptcha-token'; },
    reset: function() {},
  };
`;

export async function mockRecaptcha(page: Page): Promise<void> {
  await page.route('**/recaptcha/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('.js') || url.includes('.js?')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: MOCK_SCRIPT,
      });
    }
    return route.fulfill({ status: 200, body: '' });
  });
}
