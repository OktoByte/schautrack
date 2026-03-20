import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('Entry Inline Edit', () => {

  async function createEntry(page: any, name: string) {
    await page.locator('input[placeholder="Breakfast, snack..."]').fill(name);
    // Fill protein (always editable, even with auto-calc)
    const macroInputs = page.locator('input[inputmode="numeric"][placeholder="0"]');
    if (await macroInputs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await macroInputs.first().fill('20');
    } else {
      await page.locator('input[inputmode="tel"][placeholder="0"]').first().fill('200');
    }
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
  }

  test('edit entry name inline', async ({ page }) => {
    await login(page);
    await createEntry(page, 'Edit test name');

    // Wait for entry to appear and scroll to it
    const nameBtn = page.getByRole('button', { name: 'Edit test name' });
    await nameBtn.scrollIntoViewIfNeeded({ timeout: 10000 });
    await expect(nameBtn).toBeVisible({ timeout: 5000 });
    await nameBtn.click();

    // Find the edit input that appeared
    const editInput = page.locator('input:focus');
    await expect(editInput).toBeVisible({ timeout: 5000 });

    await editInput.fill('Renamed entry');
    await editInput.press('Enter');

    // Verify
    await expect(page.getByText('Renamed entry')).toBeVisible({ timeout: 5000 });

    // Clean up
    const deleteBtn = page.getByText('Renamed entry').locator('..').locator('..').locator('button[title="Delete"]');
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
    }
  });

  test('edit entry calorie value inline', async ({ page }) => {
    await login(page);
    await createEntry(page, 'Cal edit test');

    // Wait for entry and scroll to it
    const entryText = page.getByText('Cal edit test');
    await entryText.scrollIntoViewIfNeeded({ timeout: 10000 });

    const row = entryText.locator('..').locator('..');

    // Find an editable numeric button (calorie or macro value)
    const editableButtons = row.locator('button.tabular-nums:not([disabled])');
    await expect(editableButtons.first()).toBeVisible({ timeout: 5000 });
    await editableButtons.first().click();

    const editInput = row.locator('input[inputmode]');
    await expect(editInput).toBeVisible({ timeout: 5000 });
    await editInput.fill('99');
    await editInput.press('Enter');

    await expect(row.getByText('99')).toBeVisible({ timeout: 5000 });

    // Clean up
    const deleteBtn = row.locator('button[title="Delete"]');
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
    }
  });
});
