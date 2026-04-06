import { test, expect } from '@playwright/test';
import { psql } from './fixtures/helpers';

test.describe('Legal Pages', () => {
  test.beforeAll(() => {
    psql(`INSERT INTO admin_settings (key, value) VALUES ('enable_legal', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`);
  });

  test('imprint page loads with address content', async ({ page }) => {
    await page.goto('/imprint');
    await expect(page).toHaveURL(/\/imprint/);

    // The heading must be visible
    await expect(page.getByRole('heading', { name: 'Imprint' })).toBeVisible({ timeout: 5000 });

    // Address and email are rendered as SVG images — verify they are present in the DOM
    const addressImg = page.locator('img[alt="Address"]');
    const emailImg = page.locator('img[alt="Email"]');

    await expect(addressImg).toBeVisible({ timeout: 5000 });
    await expect(emailImg).toBeVisible({ timeout: 5000 });

    // Confirm the SVGs actually loaded (non-broken images have naturalWidth > 0)
    const addressLoaded = await addressImg.evaluate(
      (el: HTMLImageElement) => el.naturalWidth > 0 || el.src.startsWith('data:')
    );
    expect(addressLoaded).toBe(true);
  });

  test('privacy page loads with policy content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Schautrack collects')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Data We Collect')).toBeVisible({ timeout: 5000 });
  });

  test.skip('legal pages hidden when disabled', async ({ page }) => {
    // ENABLE_LEGAL is set via env var in compose.test.yml — can't override via admin_settings.
    // This test requires restarting the container with ENABLE_LEGAL=false, which isn't practical in E2E.
    // Verify manually by temporarily removing the env var.
  });
});
