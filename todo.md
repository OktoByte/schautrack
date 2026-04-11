# Schautrack TODO

## Bugs (code review findings)

### Critical (crash/deadlock risk)

- [ ] **SSE cleanupLoop deadlock** — `internal/sse/broker.go:183`: calls `SendEvent()` (acquires RLock) while already holding RLock. Guaranteed deadlock every 5 minutes. Fix: copy client map while holding lock, release before sending.
- [ ] **SSE unsafe type assertion** — `internal/sse/broker.go:134`: `r.Context().Value("sseUserID").(int)` panics if value is nil or wrong type. Fix: use safe assertion with ok check.
- [ ] **SSE race condition in SendEvent** — `internal/sse/broker.go:58-75`: iterates channel set after releasing RLock. Channels could be deleted by concurrent Unsubscribe, causing send to closed channel. Fix: copy set while holding lock.

### High (silent data corruption)

- [ ] **Unchecked rows.Scan() errors** — `internal/handler/entries_helpers.go:80` and ~10 other locations. Bad scans silently produce zero/empty values.
- [ ] **Unchecked json.Unmarshal errors** — `internal/handler/api.go:37-38`, `internal/service/links.go:25-26`, `internal/service/macros.go:51-52`. Malformed JSON silently returns empty data.
- [ ] **Missing rows.Err() after loops** — ~15 locations across handlers and services.

### Medium (correctness)

- [ ] **Goroutine leak in parallel migrations** — `internal/database/migrations.go:536`: if one migration errors early, remaining goroutines leak. Fix: use `sync.WaitGroup` or drain all results.
- [ ] **TOCTOU in email verification** — `internal/handler/auth_email.go:48-80`: token expiry checked then marked used in separate steps. Fix: atomic `WHERE used = FALSE AND expires_at > NOW()`.
- [ ] **Password migration fire-and-forget** — `internal/handler/auth.go:113`: uses `context.Background()` and silently swallows errors.
- [ ] **SSE channel never closed** — `internal/sse/broker.go:34`: channels created but never closed in Unsubscribe.

### Low (performance/polish)

- [ ] **N+1 queries in SSE broadcast** — `internal/service/links.go:88-121`: 3 sequential queries instead of one JOIN.
- [ ] **Frontend: inline callbacks cause re-renders** — Dashboard.tsx onSubmit, TodayPanel status objects.
- [ ] **Frontend: no feedback on invalid weight** — WeightRow silently ignores bad input.
- [ ] **Frontend: missing error boundaries** — no boundaries around AIPhotoModal/BarcodeScanModal.
- [ ] **Frontend: TodoList toggle has no error feedback** — optimistic update reverts silently on error.

---

## Features

### 1. Undo on delete
- Entries/weight/todos delete instantly with no way back. Add a short undo toast (3-4s) before the actual deletion.

### 2. Weight chart
- Weight entries have no trend visualization. Add a sparkline or line chart to show progress over time.

### 3. Lazy loading routes
- All pages bundled together. Wrap routes in `React.lazy` to improve initial load time on mobile.

---

## Maybe

### 4. Meal categories
- Group entries by breakfast/lunch/dinner/snack for easier scanning.

### 5. Favorites / recent foods
- Quick-add from recently logged entries to save repetitive typing.

### 6. Calorie goal streak
- Todos have streaks but the main calorie goal doesn't. A streak counter on the dashboard would be motivating.

### 7. CSV export
- Only JSON supported. CSV would be useful for spreadsheet analysis.
