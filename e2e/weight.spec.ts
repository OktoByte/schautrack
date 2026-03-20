import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('Weight Tracking', () => {
  test('track and delete weight entry', async ({ page }) => {
    await login(page);

    // Weight input is always visible, saves on blur
    const weightInput = page.getByLabel(/Weight in/);
    await weightInput.scrollIntoViewIfNeeded({ timeout: 5000 });
    await expect(weightInput).toBeVisible();

    // Fill in weight and blur to trigger save
    await weightInput.fill('75.5');
    await weightInput.blur();
    await expect(page.getByText('Weight tracked')).toBeVisible({ timeout: 5000 });

    // Delete button should now be enabled
    const deleteBtn = page.getByTitle('Delete weight entry');
    await expect(deleteBtn).toBeEnabled({ timeout: 3000 });
    await deleteBtn.click();

    // Weight should be cleared
    await expect(weightInput).toHaveValue('', { timeout: 5000 });
  });
});
