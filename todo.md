# Schautrack Priority 1 Tasks

## Bugs

### 1. AI button not showing on staging (and for global key users)
- **Problem:** `hasAiEnabled` in `internal/handler/entries.go:206` only checks `user.AIKey`, ignoring the global AI key. Users without a personal key never see the AI button, even when a global key is configured.
- **Fix:** Also check if a global AI key exists in admin settings or env vars when determining `hasAiEnabled`.
- **Files:** `internal/handler/entries.go`, `client/src/pages/Dashboard/EntryForm.tsx`

### 2. AI settings don't indicate global key availability
- **Problem:** Settings page shows no hint that a global API key is configured. Users don't know AI works without setting their own key.
- **Fix:** Backend should send `hasGlobalAiKey: bool` to frontend. Settings UI shows "Global API key configured" when true and user has no personal key.
- **Files:** `internal/handler/api.go`, `client/src/pages/Settings/AISettings.tsx`

### 3. Weight row: replace button with always-visible input
- **Problem:** Current WeightRow has a "Track" button and toggles between view/edit modes. User wants a text input always showing.
- **Fix:** Remove button and view/edit toggle. Always show an input field. Green text if weight entered today, grey if from yesterday/older or never.
- **Files:** `client/src/pages/Dashboard/WeightRow.tsx`

### 4. Entry names invisible with all 6 macros on mobile
- **Problem:** With all macros enabled, fixed-width columns total ~408px, exceeding mobile viewport. The flex-1 name column gets zero space.
- **Fix:** Consider horizontal scroll for rows, or abbreviate/hide lower-priority macro columns on mobile, or use a compact number format.
- **Files:** `client/src/pages/Dashboard/EntryList.tsx`

### 5. Horizontal scroll on mobile (Android webview)
- **Problem:** Dashboard allows left-right scrolling on Android. Layout padding + min-width constraints cause ~16px overflow.
- **Fix:** Audit `min-w-[320px]` in EntryList and Layout padding. Ensure no horizontal overflow on 320px viewport. Add `overflow-x: hidden` at root level if needed.
- **Files:** `client/src/pages/Dashboard/EntryList.tsx`, `client/src/components/Layout/Layout.tsx`

### 6. 2000 cal display issue on Android
- **Problem:** Calorie goal number may not render correctly on Android WebView. Possible causes: `font-variant-numeric: tabular-nums` support, grid `minmax(140px,1fr)` collapse on narrow screens, or text overflow.
- **Fix:** Investigate on device. May need fallback for tabular-nums, or min-width adjustment on TodayPanel grid.
- **Files:** `client/src/pages/Dashboard/TodayPanel.tsx`
- **Status:** Needs clarification on exact visual issue

### 7. 2FA recovery not possible
- **Problem:** Disabling 2FA requires a valid TOTP code. If user loses their authenticator, they're locked out.
- **Fix:** Generate 8-10 one-time backup codes when enabling 2FA. Store hashed in new `totp_recovery_codes` table. Allow recovery code to disable 2FA. Show codes once on enable + allow regeneration.
- **Files:** `db/init.sql`, `internal/database/migrations.go`, `internal/handler/settings.go`, `client/src/pages/Settings/TwoFactorSettings.tsx`, `client/src/api/settings.ts`

## UI Improvements

### 8. Todo settings: move higher and improve look
- **Problem:** Todo settings are positioned low in settings page (between LinkSettings and Data export). UI could be better.
- **Fix:** Move TodoSettings higher in settings layout. Improve visual design of the todo management interface.
- **Files:** `client/src/pages/Settings/Settings.tsx`, `client/src/pages/Settings/TodoSettings.tsx`

### 9. Todo checkoff should be on the right
- **Problem:** Checkbox for completing todos is on the left. Should be on the right.
- **Fix:** Move checkbox to right side of each todo item in TodoList.
- **Files:** `client/src/pages/Dashboard/TodoList.tsx`

## Features

### 10. Daily notes (enableable)
- **Problem:** No way to write daily notes/journal entries.
- **Fix:** New feature following the todo pattern:
  - DB: `daily_notes` table (user_id, note_date, content, created_at, updated_at)
  - Migration in `internal/database/migrations.go`
  - User setting: `notes_enabled` boolean
  - Backend: handler + routes for CRUD
  - Frontend: Settings toggle + Dashboard component (text area per day)
  - SSE broadcast on changes for linked users
- **Files:** New + `db/init.sql`, `internal/database/migrations.go`, `internal/model/models.go`, `cmd/server/main.go`, `client/src/pages/Settings/Settings.tsx`, `client/src/pages/Dashboard/Dashboard.tsx`

### 11. OpenFoodDatabase environment flag
- **Problem:** Barcode/OpenFoodFacts feature is always enabled. Should be toggleable via env var.
- **Fix:** Add `ENABLE_BARCODE` env var (default: true). Gate the route registration and send flag to frontend so EntryForm hides the barcode button when disabled. Document in CLAUDE.md and README.
- **Files:** `internal/config/config.go`, `cmd/server/main.go`, `internal/handler/entries.go`, `client/src/pages/Dashboard/EntryForm.tsx`, `CLAUDE.md`

### 12. Invite-only / approval-only registration
- **Problem:** Registration is open to everyone. Admin should be able to control who can create accounts.
- **Fix:**
  - Admin setting: `registration_mode` (open / invite-only)
  - DB: `invite_codes` table (code, email, expires_at, used, created_by)
  - Admin UI: generate invite links, view pending/used invites
  - Registration: require valid invite code when mode is invite-only
  - Email: send invite email with registration link (if SMTP configured)
  - If email is set on invite, require email verification (already exists)
- **Files:** `db/init.sql`, `internal/database/migrations.go`, `internal/config/config.go`, `internal/handler/auth.go`, `internal/handler/admin.go`, `internal/service/email.go`, `client/src/pages/Admin/Admin.tsx`, `client/src/pages/Auth/Register.tsx`

---

## Suggested Order

1. **Quick wins first:** #1 + #2 (AI button/settings), #3 (weight row), #9 (todo checkoff), #11 (barcode flag)
2. **Mobile fixes:** #4 + #5 (entry layout + horizontal scroll), #6 (2000 cal)
3. **UI polish:** #8 (todo settings position/look)
4. **Medium features:** #10 (daily notes), #7 (2FA recovery codes)
5. **Big feature:** #12 (invite-only registration)
