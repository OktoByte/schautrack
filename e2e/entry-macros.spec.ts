import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('Entry with Macros', () => {

  test('track entry with macro values', async ({ page }) => {
    await login(page);

    // Check if macro inputs are visible (user needs macros enabled)
    const proteinInput = page.locator('input[inputmode="numeric"][placeholder="0"]').first();
    const hasMacros = await proteinInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasMacros) {
      test.skip(true, 'Macros not enabled for test user');
      return;
    }

    // Fill in entry with macros
    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Chicken breast');
    await page.locator('input[inputmode="tel"][placeholder="0"]').first().fill('250');

    // Fill macro fields (protein, carbs, fat in order)
    const macroInputs = page.locator('input[inputmode="numeric"][placeholder="0"]');
    const count = await macroInputs.count();
    if (count >= 1) await macroInputs.nth(0).fill('30');
    if (count >= 2) await macroInputs.nth(1).fill('5');
    if (count >= 3) await macroInputs.nth(2).fill('8');

    // Submit
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });

    // Wait for entry to appear in list (SSE updates)
    const entryText = page.getByText('Chicken breast');
    await entryText.scrollIntoViewIfNeeded({ timeout: 10000 });
    await expect(entryText).toBeVisible({ timeout: 5000 });

    // Clean up
    const deleteBtn = entryText.locator('..').locator('..').locator('button[title="Delete"]');
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
      await expect(page.getByText('Chicken breast')).not.toBeVisible({ timeout: 5000 });
    }
  });
});
