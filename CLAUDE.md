# Korope web v1

Seat-booking platform for scheduled shared minibuses in Lagos. One Next.js app, three surfaces: passenger PWA `/(passenger)`, driver PWA `/driver`, ops console `/ops`.

Read first: `docs/korope-bible.md` (product and design source of truth), `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/DECISIONS.md`.

Screens and components: `design/canvas/` mirrors the Claude Design canvas (https://claude.ai/code/artifact/5e43fc40-8359-490f-ba0a-1a71f42c0d05). Artboards are named by screen number (`S09_Seats.dc.html` is screen 09); `C0x` are components, `B0x` brand foundations, `H0x` motion and inventory. `korope-ui.css` there is the reference styling to port, not a stylesheet to import. The canvas wins over the bible on layout and copy; the rules below win over both.

## Stack
Next.js App Router (TS strict) · Tailwind with the Korope token preset · Supabase (Postgres + PostGIS, Auth, Realtime, Storage, Edge Functions, Cron) · Google Maps Platform (Maps JS vector + Map ID, Places New, Routes) · Paystack · Termii · Serwist · vaul · Zod · TanStack Query · Vitest · Playwright · pgTAP · Sentry · Vercel.

## Where logic lives
- Business rules (fares, availability, holds, bookings, refunds, wallet, boarding) are Postgres functions. Route handlers and Server Actions validate with Zod (`src/lib/contracts`), call one RPC, and return. No business logic in React components. A future Expo app must be able to reuse every backend path.
- Concurrency is enforced in the database (exclusion constraint on `seat_occupancy`, unique ledger `reference`, non-negative wallet check, row locks). Never "check then insert" in app code.
- Every table has RLS. Every new policy gets a pgTAP test with allowed and denied personas. The service role key is only used in server route handlers that need it.
- Positions from drivers and the simulator go through `POST /api/ingest/position` only.
- Write any decision not covered by the bible or brief into `docs/DECISIONS.md`.

## Design rules (non-negotiable)
- No hardcoded colours, spacing, radius, shadows or durations. Use token utilities from the preset (`bg-surface`, `text-fg-muted`, `p-16`, `rounded-m`, `shadow-2`, `duration-base`) or `var(--token)`. Tokens come from `src/styles/tokens.css`, copied verbatim from the design handoff; never edit values there by hand.
- No purple. No pill buttons: `rounded-pill` is for chips and badges only.
- Icons: Lucide only. No emoji as icons or decoration.
- Font: Onest via `next/font`, includes ₦. Never the framework default font.
- Touch targets at least 48 px (`min-h-touch min-w-touch`). Primary actions in the bottom thumb zone. Design for 360–430 px first, `100dvh`, safe-area insets, no horizontal scroll.
- Colour is never the only signal (seat states use shape + label). AA contrast, visible focus (`--focus-ring`), labelled controls, layouts survive 200% text.
- Respect `prefers-reduced-motion`. CSS transitions and View Transitions first; Framer Motion only for a genuine shared-element need, never on the home route. Haptics via `navigator.vibrate` behind a feature check.

## Copy rules
- No em dashes in UI copy. No vague marketing headlines. No fake testimonials, ratings or usage counters.
- Errors never blame the user and always say whether money moved ("Nothing has been charged.").
- Money: `formatNaira(kobo)` from `src/lib/money.ts` only (`₦1,500`). Kobo integers everywhere else.
- Times: `src/lib/time.ts`, Africa/Lagos.

## Performance
- Passenger home initial JS under 170 KB gzipped excluding the Maps SDK (`size-limit` in CI).
- Map loads after first paint behind a skeleton.
- Realtime subscriptions are per screen (one departure) and removed on unmount.
- No autoplay media. Images AVIF/WebP.

## Workflow
- Small commits with clear messages. Secrets only in env vars; keep `.env.example` current.
- Before pushing: `pnpm typecheck && pnpm lint && pnpm test && supabase test db`.
- Each milestone ends in a deployed Vercel preview.
