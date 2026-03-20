import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('Entry Tracking', () => {
  test('create and delete a calorie entry', async ({ page }) => {
    await login(page);

    // Fill in the entry form
    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Test meal');

    // Try filling cal first, if readonly fill a macro instead
    const calInput = page.locator('input[inputmode="tel"][placeholder="0"]').first();
    const isReadonly = await calInput.getAttribute('readonly');
    if (isReadonly !== null) {
      await page.locator('input[inputmode="numeric"][placeholder="0"]').first().fill('25');
    } else {
      await calInput.fill('500');
    }

    // Submit
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });

    // Wait for entry to appear in the list (no reload needed — SSE updates)
    const entryText = page.getByText('Test meal');
    await entryText.scrollIntoViewIfNeeded({ timeout: 10000 });
    await expect(entryText).toBeVisible({ timeout: 5000 });

    // Delete
    const entryRow = entryText.locator('..').locator('..');
    const deleteBtn = entryRow.locator('button[title="Delete"]');
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
    } else {
      // Try broader search
      const row = page.locator('div').filter({ hasText: 'Test meal' }).last();
      await row.locator('button[title="Delete"]').click();
    }
    await expect(page.getByText('Test meal')).not.toBeVisible({ timeout: 5000 });
  });
});
