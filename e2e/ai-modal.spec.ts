import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('AI Photo Modal', () => {
  test('AI button opens modal with tabs', async ({ page }) => {
    await login(page);

    // Find and click the AI button (sparkles icon)
    const aiButton = page.locator('button[title="Estimate with AI"]');
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    await aiButton.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('AI Calorie Estimate')).toBeVisible();

    // Should have Camera and Upload tabs
    await expect(modal.getByRole('button', { name: 'Camera' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Upload' })).toBeVisible();

    // Switch to Upload tab
    await modal.getByRole('button', { name: 'Upload' }).click();

    // Should show file input
    await expect(modal.locator('input[type="file"]')).toBeVisible();

    // Close modal via the X button (Dialog.Close)
    await modal.locator('button.text-destructive').click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });
});
