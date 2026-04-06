import { test, expect } from '@playwright/test';
import { psql } from './fixtures/helpers';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';

test.describe('Legal Pages', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    psql(`INSERT INTO admin_settings (key, value) VALUES ('enable_legal', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`);
  });

  test.afterAll(() => {
    // Restore enabled state
    psql(`INSERT INTO admin_settings (key, value) VALUES ('enable_legal', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`);
  });

  test('imprint page loads with address content', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/imprint`);

    await expect(page.getByRole('heading', { name: 'Imprint' })).toBeVisible({ timeout: 10000 });

    const addressImg = page.locator('img[alt="Address"]');
    const emailImg = page.locator('img[alt="Email"]');

    await expect(addressImg).toBeVisible({ timeout: 5000 });
    await expect(emailImg).toBeVisible({ timeout: 5000 });
    await ctx.close();
  });

  test('privacy page loads with policy content', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/privacy`);

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible({ timeout: 10000 });
    await ctx.close();
  });

  test('legal pages hidden when disabled', async ({ browser }) => {
    // Disable legal
    psql(`INSERT INTO admin_settings (key, value) VALUES ('enable_legal', 'false') ON CONFLICT (key) DO UPDATE SET value = 'false'`);

    // Wait for settings cache to expire (1 minute TTL)
    // Instead of waiting, check the SVG endpoints directly — they bypass the SPA
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();

    // The SVG endpoints should return 404 when legal is disabled
    const addressRes = await page.request.get(`${baseURL}/imprint/address.svg`);
    const emailRes = await page.request.get(`${baseURL}/imprint/email.svg`);

    expect(addressRes.status()).toBe(404);
    expect(emailRes.status()).toBe(404);

    // Restore
    psql(`INSERT INTO admin_settings (key, value) VALUES ('enable_legal', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`);
    await ctx.close();
  });
});
