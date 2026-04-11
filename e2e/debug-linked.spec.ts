import { test } from '@playwright/test';
import { loginUser } from './fixtures/helpers';

test('debug: linked views in browser', async ({ browser }) => {
  const { context: ctx, page } = await loginUser(browser, 'e2e-linked-sse-b@test.local', 'test1234test');

  const response = await ctx.request.get('http://localhost:3001/api/dashboard');
  const data = await response.json();
  console.log('sharedViews count:', data.sharedViews?.length);
  for (const v of (data.sharedViews || [])) {
    console.log('  -', v.label, 'isSelf:', v.isSelf);
  }

  await page.goto('http://localhost:3001/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  const spans = await page.locator('span.text-sm.font-medium').allTextContents();
  console.log('spans:', JSON.stringify(spans));

  await ctx.close();
});
