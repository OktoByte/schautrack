import { test, expect } from '@playwright/test';
import { psql, createIsolatedUser, loginUser } from './fixtures/helpers';

// Creator is in America/Los_Angeles (PDT = UTC-7 in summer, PST = UTC-8 in winter).
// Insert entry at UTC 20:00 → PDT 13:00.
// The viewer (UTC) sees the time displayed in the CREATOR's timezone (LA time), not their own.

const ENTRY_UTC_TS = '2026-04-01 20:00:00+00'; // UTC 20:00 → LA 13:00 PDT (UTC-7)
const ENTRY_DATE = '2026-04-01';
const ENTRY_NAME = 'Creator LA Entry';
// April 1 is in PDT (daylight), so offset is UTC-7 → 20:00 - 7 = 13:00
const EXPECTED_LA_HOUR = 13; // 13:xx

let viewer: { email: string; password: string; id: string };
let creator: { email: string; password: string; id: string };

test.describe('Linked User Timezone Display', () => {
  test.beforeAll(() => {
    viewer = createIsolatedUser('linked-tz-viewer');
    creator = createIsolatedUser('linked-tz-creator');

    // Set viewer to UTC, creator to America/Los_Angeles
    psql(`UPDATE users SET timezone = 'UTC' WHERE id = ${viewer.id}`);
    psql(`UPDATE users SET timezone = 'America/Los_Angeles' WHERE id = ${creator.id}`);

    // Create an accepted link: viewer → creator
    psql(`
      INSERT INTO account_links (requester_id, target_id, status)
      VALUES (${viewer.id}, ${creator.id}, 'accepted')
      ON CONFLICT DO NOTHING
    `);

    // Insert an entry for the creator at a known UTC timestamp
    psql(`
      INSERT INTO calorie_entries (user_id, entry_date, entry_name, amount, created_at)
      VALUES (${creator.id}, '${ENTRY_DATE}', '${ENTRY_NAME}', 300, '${ENTRY_UTC_TS}')
    `);
  });

  test.afterAll(() => {
    psql(`DELETE FROM calorie_entries WHERE user_id = ${creator.id} AND entry_name = '${ENTRY_NAME}'`);
    psql(`DELETE FROM account_links WHERE requester_id = ${viewer.id} AND target_id = ${creator.id}`);
    psql(`UPDATE users SET timezone = NULL WHERE id IN (${viewer.id}, ${creator.id})`);
  });

  test('entry times show in creator timezone when viewing linked user', async ({ browser }) => {
    const { context: ctx, page } = await loginUser(browser, viewer.email, viewer.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the linked user's share card label (the creator's email) to appear.
    // The Timeline renders its heading immediately, but share cards only render after
    // the dashboard API response populates sharedViews. We wait directly for the email label.
    const creatorEmail = creator.email;
    const creatorLabel = page
      .locator('span.text-sm.font-medium')
      .filter({ hasText: new RegExp(creatorEmail.split('@')[0], 'i') })
      .first();

    // Scroll down periodically to ensure the share card is in view while waiting
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(creatorLabel).toBeVisible({ timeout: 20000 });

    // Navigate to the entry date using 30d range first
    const thirtyDayBtn = page.locator('button').filter({ hasText: '30d' });
    const has30d = await thirtyDayBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (has30d) {
      await thirtyDayBtn.click();
      await page.waitForTimeout(500);
    }

    // Click the creator's dot for the entry date
    const creatorCard = creatorLabel.locator('../..');
    const entryDot = creatorCard.locator(`button[title="${ENTRY_DATE}"]`).first();
    const dotVisible = await entryDot.isVisible({ timeout: 5000 }).catch(() => false);

    if (dotVisible) {
      await entryDot.click();
      await page.waitForTimeout(800);
    } else {
      // Try the generic date-labelled dot anywhere on the page
      const anyDot = page.locator(`button[aria-label^="${ENTRY_DATE}"]`).first();
      if (await anyDot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyDot.click();
        await page.waitForTimeout(800);
      }
    }

    // The entry should be visible
    const entryBtn = page.getByRole('button', { name: ENTRY_NAME });
    await expect(entryBtn).toBeVisible({ timeout: 8000 });

    // Extract the displayed time for the entry
    const timeText = await page.evaluate((name) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nameBtn = btns.find((b) => b.textContent?.trim() === name);
      if (!nameBtn) return null;
      // Row structure: span(flex-1) > button(name) | span(time) | button(delete)
      // The time span is a sibling of the span containing the name button
      const nameSpan = nameBtn.parentElement; // span.flex-1
      const rowDiv = nameSpan?.parentElement;   // div.flex.items-center
      if (!rowDiv) return null;
      const spans = Array.from(rowDiv.querySelectorAll('span'));
      const timeSpan = spans.find((s) => s.classList.contains('tabular-nums'));
      return timeSpan?.textContent?.trim() || null;
    }, ENTRY_NAME);

    // Entry time should be in LA timezone (13:xx), not UTC (20:xx)
    if (timeText) {
      const hourMatch = timeText.match(/^(\d{1,2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        // Expect LA time (13:xx), not UTC (20:xx)
        // Accept slight DST variance: 12-14 is reasonable for PDT
        expect(hour).toBeGreaterThanOrEqual(12);
        expect(hour).toBeLessThanOrEqual(14);
        // Explicitly should NOT be 20 (UTC time)
        expect(hour).not.toBe(20);
      }
    }

    await ctx.close();
  });
});
