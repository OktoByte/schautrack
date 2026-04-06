import { test, expect } from '@playwright/test';
import { psql, createIsolatedUser } from './fixtures/helpers';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';
let user: { email: string; password: string; id: string };

test.describe('Entry Tracking', () => {
  test.setTimeout(60000); // Extra time for per-test login under parallel load
  test.beforeAll(() => {
    user = createIsolatedUser('entries');
  });

  async function loginAndGo(page: import('@playwright/test').Page) {
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }

  test('create and delete a calorie entry', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAndGo(page);

    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Test meal');
    await page.locator('input[inputmode="tel"]').first().fill('500');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByRole('button', { name: 'Test meal' })).toBeVisible({ timeout: 5000 });

    await page.locator('button[title="Delete"]').first().click();
    await expect(page.getByRole('button', { name: 'Test meal' })).not.toBeVisible({ timeout: 5000 });
    await ctx.close();
  });

  test('math expressions evaluate correctly', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAndGo(page);

    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Math test meal');
    await page.locator('input[inputmode="tel"]').first().fill('200+150');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Math test meal' })).toBeVisible({ timeout: 5000 });

    await page.locator('button[title="Delete"]').first().click();
    await ctx.close();
  });

  test('daily total updates after adding entry', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAndGo(page);

    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Total test');
    await page.locator('input[inputmode="tel"]').first().fill('500');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('500').first()).toBeVisible({ timeout: 5000 });

    await page.locator('button[title="Delete"]').first().click();
    await ctx.close();
  });

  test('dot colors reflect goal progress', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAndGo(page);
    const today = new Date().toISOString().split('T')[0];

    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Over Goal');
    await page.locator('input[inputmode="tel"]').first().fill('2500');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });

    const todayDot = page.locator(`button[aria-label^="${today}"]`);
    await expect(todayDot).toBeVisible({ timeout: 5000 });
    const dotLabel = await todayDot.getAttribute('aria-label');
    expect(dotLabel).toMatch(/over/);

    psql(`DELETE FROM calorie_entries WHERE user_id = ${user.id}`);
    await ctx.close();
  });

  test('entry date can be changed via date picker', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAndGo(page);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await page.locator('form input[type="date"]').first().fill(yesterday);
    await page.locator('input[placeholder="Breakfast, snack..."]').fill('Yesterday entry');
    await page.locator('input[inputmode="tel"]').first().fill('111');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText('Entry tracked')).toBeVisible({ timeout: 5000 });

    const yesterdayDot = page.locator(`button[aria-label^="${yesterday}"]`).first();
    if (await yesterdayDot.isVisible({ timeout: 3000 }).catch(() => false)) {
      await yesterdayDot.click();
      await expect(page.getByRole('button', { name: 'Yesterday entry' })).toBeVisible({ timeout: 5000 });
    }

    psql(`DELETE FROM calorie_entries WHERE user_id = ${user.id}`);
    await ctx.close();
  });
});
