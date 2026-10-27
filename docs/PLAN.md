# Korope web v1: Delivery plan

Each milestone ends with a working Vercel preview, green CI (typecheck, lint, unit, SQL tests), and a short demo note in the PR. Tasks are sized to land as small reviewable commits.

Legend: `[ ]` todo, `[x]` done.

---

## M0 Foundation

- [ ] Next.js (latest stable, App Router, TS strict), pnpm, ESLint, Prettier, `size-limit`
- [ ] Copy handoff into repo: `src/styles/tokens.css` (verbatim), `tailwind.korope.js` preset, `design/map-style-*.json`, `design/map-overlays.json`
- [ ] Tailwind wired to the preset only (default palette, spacing and radius removed so hex/px utilities fail lint)
- [ ] Onest via `next/font/google`, subsets `latin` + `latin-ext` (latin-ext carries ₦ U+20A6), weights 400/500/600/700; visual check that ₦ renders in Onest, not the fallback
- [ ] ESLint rules: no hex colours / arbitrary px values in `className`, no `rounded-pill` on `<button>`, no em dash in JSX text, no emoji in JSX text
- [ ] `lib/money.ts` (`formatNaira(kobo)` → `₦1,500`) and `lib/time.ts` (Africa/Lagos) with unit tests
- [ ] Base components: Button, IconButton, Input (phone +234, amount), OtpInput, Chip, Badge, Toast, Banner, Skeleton, EmptyState, BottomSheet (vaul: peek 176 px, half 50%, full top 56)
- [ ] Supabase project (staging) + local CLI; migration 0001: extensions (postgis, btree_gist, pg_trgm, pg_cron, pg_net), organizations, profiles, user_roles, role helpers, profile trigger, custom access token hook
- [ ] RLS on every table from day one; pgTAP harness with persona helpers; CI job `supabase test db`
- [ ] Auth: phone OTP via Send SMS hook → `/api/auth/sms-hook` → Termii; Google provider; phone-required gate after Google
- [ ] Middleware role routing for `/driver` and `/ops`
- [ ] PWA shell: manifest (passenger and driver scopes), Serwist SW, offline banner, placeholder icons (maskable)
- [ ] Custom 404, `/legal`, `/privacy`, `/terms` shells
- [ ] Sentry (client, server, edge) with PII scrubbing
- [ ] GitHub Actions CI; Vercel project with preview deploys; `.env.example`

## M1 Network and simulator

- [ ] Migrations: stops, place_aliases, routes, route_stops, seat_layouts, layout_seats, vehicles, vehicle_blocked_seats, drivers, timetables, departures, departure_stop_times, fare_rules, fare_matrix, vehicle_positions, vehicle_live, simulator_state, audit_log
- [ ] `generate_departures()` + nightly cron; pgTAP tests (idempotent, respects days and validity)
- [ ] Seed: Lekki → VI / Lagos Island corridor. Coordinates captured from Google Maps and verified against the Geocoding API, each with a landmark line and `is_lit` / `is_sheltered`:
  - Stops (target 14): Ajah, Abraham Adesanya, Jakande, Chevron, Ikota, Lekki Phase 1 gate, Admiralty Way, Lekki toll gate, Falomo, Adeola Odeku, Ahmadu Bello Way, Bonny Camp, CMS, Marina
  - Routes (3): **L1** Ajah → CMS/Marina (expressway, toll gate, Ozumba Mbadiwe); **L2** Chevron → Ahmadu Bello Way (Admiralty Way, toll gate, Adeola Odeku); **L3** Lekki Phase 1 → Falomo (Lekki–Ikoyi link bridge) → CMS
  - Aliases: "Chevron" → Chevron Roundabout, "Phase 1", "Toll gate", "Jakande first gate", "Falomo bridge", "CMS bus stop", "Marina Tinubu Square", etc.
  - 5 vehicles (14, 16, 18 seat layouts), 5 drivers, weekday peak timetable (inbound 06:00–09:30 every 15–20 min, outbound 16:30–20:00)
  - Fares: segment mode, base ₦500 + ₦150 per segment, capped per route (ops can edit)
- [ ] `/api/ingest/position` + `ingest_positions()` (snap to route, progress, current stop, ETAs, broadcast)
- [ ] `simulator-tick` Edge Function + cron; traffic profile; dwell; seeded noise
- [ ] Ops: auth-gated shell, live map (real vs simulated labelled), departures board, simulator controls
- [ ] Ops: routes and stops CRUD with map picker, Routes API polyline + baseline offsets on save
- [ ] Ops: timetable editor → generate departures; vehicles CRUD + seat layout editor; drivers CRUD + assignment; fare tables

## M2 Passenger booking

- [ ] Splash, onboarding (4 screens, copy from Vol III ch. 1 without Korope+ promises), sign-in, OTP, contextual permissions
- [ ] Home: skeleton map → lazy MapStage, greeting, floating search, saved and recent places, booking sheet (peek/half/full), bottom nav (5 tabs; Korope+ tab is the interest form)
- [ ] Search: Places (New) autocomplete server route + `search_places()` merge, stops first
- [ ] `search_departures()` + departure options screen (max 3, Recommended with reason)
- [ ] Stop detail (photo, landmark, lit/sheltered, walk deep link)
- [ ] `seat_occupancy` + exclusion constraint, `create_hold`, `release_hold`, `seat_map`, sweeper cron, seat broadcast trigger
- [ ] SeatMap (shape + label per state, not colour alone), HoldTimer, realtime per departure
- [ ] `quote_fare` + CardFare with nullable adjustment line
- [ ] Ledger tables, triggers, `wallet_reconcile`; pgTAP: balanced txns, non-negative wallet, idempotent reference
- [ ] Paystack: `start_topup`, inline checkout, `/api/paystack/webhook` (HMAC, verify API, `credit_topup`), reconcile job
- [ ] `confirm_booking` + confirm screen (inline top-up when short) + confirmed state (600 ms sequence)
- [ ] Concurrency tests: N parallel connections racing for overlapping and non-overlapping segments of one seat; double confirm of one hold; confirm vs expiry; concurrent debits draining a wallet
- [ ] Wallet screen: balance, top-up, ledger history, receipts

## M3 Live journey

- [ ] Waiting screen: live bus, ETA with confidence, walk deep link, CardDriver
- [ ] `departure:{id}:live` subscription, marker animation, approach states
- [ ] Push: VAPID keys, subscribe flow, iOS add-to-home-screen explainer, outbox + dispatcher, "2 stops away", "arriving", "your stop is next"
- [ ] Boarding pass: token issue/rotate, IndexedDB + SW cache, offline variant
- [ ] Live trip: TimelineRoute, progress, occupancy, share trip (`trip_shares`, `/t/[token]`), SOS (hold 2 s → `tel:112` + Termii SMS to contacts)
- [ ] Arrival card, rating tags, receipt
- [ ] Trips tab: upcoming, active, past, cancel with refund

## M4 Driver PWA

- [ ] Driver OTP (pre-registered only), pre-shift screen, checklist, start shift
- [ ] GPS posting with wake lock, throttle, heartbeat, screen-on warning, permission recovery
- [ ] Driver home: next stop, to board, to alight
- [ ] QR boarding mode (`BarcodeDetector` → zxing-wasm fallback), `/api/qr/validate`, result screens
- [ ] Manifest check-in fallback, no-show marking
- [ ] Incident report with photo upload (Storage, compressed client-side)
- [ ] End shift summary

## M5 Ops completion and hardening

- [ ] Bookings search, cancel and refund; wallet ledger view; manual adjustment with audit
- [ ] Incidents board
- [ ] Audit log viewer
- [ ] Rate limiting on OTP, holds, confirm, top-up
- [ ] Sentry alerts (webhook failures, reconcile mismatch, ingestion lag)
- [ ] Lighthouse mobile ≥ 85 on throttled Moto G profile (CI with `@lhci/cli`)
- [ ] Accessibility pass: axe in Playwright, 200% text, focus order, screen reader labels
- [ ] Playwright E2E at 390 px: sign in → search → seat → top up (Paystack test) → confirm → pass → simulated boarding → live trip → rating
- [ ] Launch checklist review

---

## Launch checklist (status tracked here)

| Item | Status |
|---|---|
| Custom domain connected | Not started |
| Favicon and app icons (all PWA sizes, maskable) | Not started; needs final logo |
| No "made with" badges | Not started |
| Privacy policy (NDPA 2023: location, phone, payment data, retention) | Not started; needs legal review |
| Terms and conditions incl. booking, cancellation and refund policy | Not started; refund rules need sign-off |
| Custom 404 matching the design | Not started; 404 design referenced in inventory (21c) but screen not in handoff |
| Paystack live keys and webhook URL set | Not started |
| Google Maps keys restricted | Not started |
| Termii sender ID approved | Not started; apply early, approval takes days |
