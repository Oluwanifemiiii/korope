# Decisions

Decisions not settled by the brief or the bible. Newest at the bottom. Each one prefers the simplest option that keeps a future React Native / Expo app possible.

### D-001 Holds and bookings share one occupancy table
An exclusion constraint cannot span two tables. Putting both in `seat_occupancy` (with `kind` = hold or booking) means one constraint prevents every overlap, and confirming converts the same row so the seat is never momentarily free.

### D-002 Expired holds are cleared inside `create_hold`
Exclusion constraints cannot use `now()`. `create_hold` expires stale holds on the target seat in the same transaction before inserting, so correctness never depends on the sweeper's timing.

### D-003 Segment range is half-open over stop sequence
`int4range(board_seq, alight_seq, '[)')`. A 2→5 booking and a 5→8 booking on the same seat do not overlap.

### D-004 Roles are read from a table, not trusted from the JWT
RLS helpers query `user_roles` (security definer). The JWT `roles` claim is only for middleware routing. Revoking a role takes effect immediately.

### D-005 Wallet balance is a cached column checked against the ledger
`ledger_accounts.balance_kobo` is updated by trigger on entry insert so `confirm_booking` can `SELECT ... FOR UPDATE` one row and the `CHECK (balance >= 0)` constraint stops overdrafts. `wallet_reconcile()` compares it hourly with `sum(ledger_entries)`. Entries are insert-only; corrections are new transactions.

### D-006 Realtime uses private broadcast, not postgres_changes
Seat and position updates go out through `realtime.send()` from triggers with RLS on `realtime.messages`. This keeps other passengers' identities out of payloads and scopes subscriptions to one departure.

### D-007 The simulator talks HTTP to the ingestion endpoint
It never writes SQL. It authenticates with `SIMULATOR_TOKEN` and may only post for `simulated = true` vehicles; drivers may only post for real vehicles assigned to them.

### D-008 Primary buttons are not pills
The bible's Component 001 gives the primary button radius 999. The brief overrides it: Radius/Pill is for chips and badges only. The design canvas agrees (C01, B06): buttons use Radius/M (12 px), 56 px tall (48 px for M). Lint enforces it.

### D-009 No emoji in UI
The bible shows emoji in examples (destination cards, weather chip, seat legend). These are rendered with Lucide icons (the handoff's icon paths are Lucide) and text labels.

### D-010 Weather chip, rewards, referrals, multi-stop, voice search, book-for-someone are out of v1
They appear in the bible's Home and Wallet blueprints. Home omits them; the search bar has no mic button in v1.

### D-011 Proposed refund policy (needs product sign-off)
- Cancelled by the passenger 30 minutes or more before the scheduled time at their boarding stop: full refund to wallet.
- Less than 30 minutes before: 50% refund.
- After the bus has departed their boarding stop, or no-show: no refund.
- Departure cancelled by Korope or bus more than 20 minutes late at the boarding stop: full refund, automatically.
Refunds always go back to the Korope wallet in v1 (no card refunds). Implemented in `cancel_booking`, so changing the rule is one migration.

### D-012 Boarding token expiry covers the trip
A short expiry would break the offline pass. Tokens expire 2 hours after the scheduled arrival at the alighting stop; reopening online rotates `qr_version` and only the latest version validates.

### D-013 Rate limiting in Postgres
`private.rate_limit(key, max, window)` on a small table avoids adding Redis for v1 volumes. Revisit if write load on that table shows up in slow queries.

### D-014 Google sign-in requires adding a phone before booking
SOS SMS, driver contact and receipts depend on a phone number.

### D-015 Single Next.js package for now
`src/lib/contracts` holds the Zod schemas. When the Expo app starts, contracts and the generated Supabase types move to a `packages/` workspace without changing the backend.

### D-016 Map styling
The handoff provides legacy style JSON. Vector maps with a Map ID use cloud-based styling, so the JSON is imported into two Cloud Console styles (light, night) and referenced by `NEXT_PUBLIC_MAP_ID_LIGHT/NIGHT`. Overlay colours are read from CSS tokens at runtime.

### D-017 Typeface
Onest (from the handoff, `--font-family`) via `next/font/google`, subsets latin + latin-ext so ₦ (U+20A6) is included. Fallback stack is the handoff's: Instrument Sans, Roboto, system-ui.

### D-018 The Claude Design canvas is the screen source of truth
`design/canvas/` mirrors https://claude.ai/code/artifact/5e43fc40-8359-490f-ba0a-1a71f42c0d05 (four pages, 59 artboards) as of 2026-10-27. Where the canvas and the bible differ on layout or copy, the canvas wins; where either conflicts with the brief's guardrails, the brief wins. Re-sync the folder when the canvas changes.

### D-019 Express services are separate routes
Screen 07 shows "Lekki Phase 1 to CMS Express" with 3 stops next to all-stops services. Modelling express as its own route (with fewer `route_stops`) keeps segment ranges, fares and the simulator unchanged. `routes.service` labels it for the Express badge.

### D-020 Fare breakdown has a service fee line
The confirm screen and Card/Fare show seat fare plus a ₦100 service fee. `fare_rules.service_fee_kobo` is charged once per booking and appears as its own line. The design's "Korope Rewards −₦0" line is left out because rewards are not in v1; the nullable `adjustment` line stays for later.

### D-021 Copy and content in the canvas that v1 changes
- **Weather chip** ("29°" on Home, 05a): left out. Weather is excluded from v1 in the brief.
- **"Screen brightness is turned up while it's open"** (13, C5): browsers cannot change screen brightness. The pass instead uses the wake lock to stop the screen sleeping and a white QR panel; the copy becomes "Show this to the driver at the door. Turn your brightness up if the scan is slow."
- **Search bar voice button** (SearchFloating `onVoice`): not rendered. Voice search is excluded.
- **Driver rating and "3 years with Korope"** (12a, C5): shown only from real data. Rating is hidden until a driver has 20 rated trips; years only when at least 1.
- **"Chat" on Card/Driver** (C5): v1 has Call and Share only. Calls go through a masked number later; in v1 the driver's work phone is shown, never the personal one.
- **"Call Korope safety line"** (21a): needs a real number before launch. Placeholder until then.
- **"Popular from Lekki"** (16b): a fixed list of seeded routes, not a usage claim.

### D-022 Driver PWA and ops console have no screen designs
They are built from the canvas components and tokens, following the bible's Vol IV ch. 4 layouts: large targets, maximum contrast, minimal text for the driver; dense tables and a map for ops (laptop-first). I will share screenshots at the end of M1 (ops) and M4 (driver) for review.

### D-023 Seat conflict offers an alternative
Screen 21b shows "Seat 3B was taken a moment ago. Your money hasn't moved. We're holding 3A, the next window seat." `suggest_seat()` finds it, but the client only holds it when the passenger taps "Keep 3A", so we never hold a seat they didn't choose.

### D-024 Logo and app icons
The refined Route Pair mark (B02) is the logo. Favicon cuts at 16, 24, 32 and 48 px use the thicker strokes drawn on the canvas, and the PWA icon is the 512 px square on Primary/600 with the mark inside the maskable 80% safe zone.
