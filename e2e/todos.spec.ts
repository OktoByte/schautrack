import { test, expect } from './fixtures/auth';
import { login } from './fixtures/auth';

test.describe('Todos', () => {
  test('create, complete, and delete a todo', async ({ page }) => {
    await login(page);

    // Todos section should be on the dashboard
    const todosHeading = page.getByText('Todos', { exact: true });
    await todosHeading.scrollIntoViewIfNeeded({ timeout: 5000 });
    await expect(todosHeading).toBeVisible();

    // Click "Add a todo" to open the manager with add form
    await page.getByText('Add a todo').click();

    // Fill in todo name and submit
    const nameInput = page.locator('input[placeholder="Todo name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('E2E Test Todo');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Close manager
    await page.getByRole('button', { name: 'Done' }).last().click();

    // Todo should appear in the list
    await expect(page.getByText('E2E Test Todo')).toBeVisible({ timeout: 5000 });

    // Toggle complete (checkbox on the right)
    const todoRow = page.locator('li').filter({ hasText: 'E2E Test Todo' });
    const checkbox = todoRow.locator('button, input[type="checkbox"]').last();
    await checkbox.click();
    await expect(todoRow.locator('.line-through')).toBeVisible({ timeout: 3000 });

    // Open Edit to delete
    await page.getByRole('button', { name: 'Edit' }).click();

    // Find "Remove" button for our todo in the manager
    await page.getByRole('button', { name: 'Remove' }).click();

    // Close manager
    await page.getByRole('button', { name: 'Done' }).last().click();

    // Todo should be gone
    await expect(page.getByText('E2E Test Todo')).not.toBeVisible({ timeout: 5000 });
  });
});
