import { test as base, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

/**
 * Log in as the test user. Reuses cached session when possible.
 */
export async function login(page: Page) {
  // Try cached session first
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (state.cookies?.length > 0) {
        await page.context().addCookies(state.cookies);
        await page.goto('/dashboard');
        // Wait a moment for client-side redirect to settle
        await page.waitForTimeout(1000);
        // Verify we're actually on the dashboard (not redirected to login)
        if (page.url().includes('/dashboard')) {
          return;
        }
      }
    } catch {
      // Session expired or invalid
    }
    // Cache didn't work — delete it
    try { fs.unlinkSync(AUTH_FILE); } catch {}
  }

  // Fresh login
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel('Email').fill('test@test.com');
  await page.getByLabel('Password').fill('test1234test');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL('/dashboard', { timeout: 15000 });

  // Save session
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
}

export { base as test, expect };
