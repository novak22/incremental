# Hustle Market

## Goals
- Rotate daily hustle offerings without mutating the base registry so the UI can announce fresh opportunities each morning.
- Support limited-time or delayed offers that span multiple days, including variant-specific metadata and simultaneous variants when templates define multiple options.
- Persist market state so day transitions can detect whether a reroll is required or if existing contracts still apply.

## Template & Variant Structure
- All instant hustles continue to live in `HUSTLE_TEMPLATES`, a filtered view of the canonical `ACTIONS` registry, so the market keeps a stable snapshot of every gig-ready template. Study tracks flow through the broader `ACTIONS` export but never appear in the daily market roll.
- Templates may define a `market` block with:
  - `variants`: optional array of variant configs (id, label, weight, duration, availableAfterDays, metadata, definitionId).
  - `durationDays` and `availableAfterDays`: defaults applied when variants omit explicit values.
  - `slotsPerRoll`: number of offers to attempt each time the market rerolls (defaults to `1`).
  - `maxActive`: hard cap for simultaneous offers from the template (defaults to `max(slotsPerRoll, variantCount)`).
  - `metadata`: extra properties merged into each offer.
- Variant metadata now supports structured progress hints:
  - `hoursPerDay` and `daysRequired` capture daily effort expectations for multi-day gigs.
  - `completionMode` toggles whether the resulting action auto-completes (`instant` / `deferred`) or requires manual wrap-up.
  - `progressLabel` lets variants override the default log title so accepted instances read naturally in the todo list.
- If no variants are provided the `rollDailyOffers` helper fabricates a default variant that mirrors the template. When variants exist, multiple offers can coexist so long as each variant is represented at most once per active window.

## Recent Tuning
- Multi-day variants now pay a 5% premium over their base hourly earnings (rounded to the nearest $5) so longer commitments feel proportionally rewarding instead of penalizing players for locking in multi-day schedules.
- Expanded DownWork ops gigs by doubling freelance writing and data entry rolls while adding a Virtual Assistant Shift (3h at $7/hour) with multi-day variants so remote admins always spot 2–3 cheerful contracts waiting.
- Every fresh offer now layers on a two-day grace period before expiring so players have breathing room to slot new contracts into their schedules without immediately losing the opportunity.

## Rolling Logic
- `rollDailyOffers({ templates, day, now, state, rng })` clones any existing offers whose `expiresOnDay` is still in the future, then fills the configured number of template slots by selecting weighted variants (defaulting to equal weights). Variant copy counts can consume multiple slots per roll while template and variant `maxActive` values prevent overfilling.
- Each new offer captures:
  - `rolledOnDay`, `availableOnDay`, and `expiresOnDay` (duration is inclusive of the start day).
  - Variant metadata (id, label, description) plus merged template/variant metadata.
  - Resolved requirements (`metadata.requirements.hours` and `metadata.hoursRequired`) and payout details (`metadata.payout.amount`, `metadata.payout.schedule`).
  - A deterministic `daysActive` array so UI layers can render availability windows.
- Offers are sorted by availability day, template id, variant id, and finally offer id for consistent rendering even when multiple copies share the same variant.

## Daily Seeding & Rerolls
- `ensureDailyOffersForDay({ state, templates, day, now, rng })` guards the bootstrap pipeline so the market only rolls when the slice is empty or stale. If the current day already holds a valid roll the helper simply clones the existing offers so duplicate entries never spawn.
- Registry bootstrap triggers the helper right after definitions load, and the day transition (`endDay`) reruns it so mornings always begin with a populated exchange without requiring manual rerolls.
- The helper honours template tuning—`availableAfterDays`, duration windows, and `maxActive` caps—so active multi-day contracts stay visible while new day-specific variants slide into open slots.

## Persistence Helpers
- `ensureHustleMarketState` guarantees the `state.hustleMarket` slice exists with `{ lastRolledAt, lastRolledOnDay, offers: [], accepted: [] }`.
- Invalid timestamps or negative days clamp to safe defaults while malformed offers are sanitized (ensuring template/variant ids and day windows are valid).
- `createDefaultHustleMarketState` and `normalizeHustleMarketOffer` live alongside the ensure helper for future orchestration tools. Accepted offers are normalized into `accepted` entries so expired claims are pruned automatically and the corresponding offers are marked as `claimed`.

## Acceptance Flow
- `acceptHustleOffer(offerId, { state })` reads the offer metadata, accepts an action instance through `acceptActionInstance`, marks the offer as claimed, and records an accepted entry with `acceptedOnDay`, `deadlineDay`, required hours, and payout schedule.
- Progress metadata is piped directly into `acceptActionInstance` so accepted entries inherit `hoursPerDay`, `daysRequired`, and manual completion flags. The todo queue uses these hints to compute step hours and keeps manual tasks visible even when hour goals are satisfied.
- Claimed offers continue to persist until their deadlines elapse so completion logging and payout scheduling remain traceable.
- When a claimed contract logs its final hours, `completeActionInstance` now resolves the linked hustle entry, pays any `onCompletion` payout immediately through `addMoney`, records the grant on the accepted entry, and forwards the amount into daily payout metrics.

## Availability Queries
- `getAvailableOffers(state, { day, includeUpcoming, includeClaimed })` returns a cloned list of active offers for the requested day. Setting `includeUpcoming: true` keeps offers whose availability window starts in the future (useful for dashboards showing "coming soon"). Passing `includeClaimed: true` allows UI layers to render offers that have been claimed but not yet completed.
- `getClaimedOffers(state, { day, includeExpired })` surfaces accepted entries so panels can highlight in-progress contracts separate from fresh opportunities.
- Both helpers rely on the ensure function so consumers can call them without first seeding the slice manually.

## Diagnostics & QA
- `getMarketRollAuditLog()` exposes a rolling log of the last 30 market rolls (also mirrored on `window.__HUSTLE_MARKET_AUDIT__`), capturing the day, preserved vs. created offers, and per-template reasons whenever a slot stays empty. The helper powers lightweight telemetry without wiring a server backend.【F:src/game/hustles/market.js†L12-L83】【F:src/game/hustles/market.js†L662-L713】
- The browser attaches `window.__HUSTLE_MARKET_DEBUG__` with `printOffers()`, `printAuditLog()`, and `getAuditLog()` so designers can inspect active offers and expiry windows during playtests. The helpers rely on the same getters documented above, so they work against live or test states.【F:src/game/hustles/market.js†L715-L755】
- Manual QA steps for the exchange now live in `docs/features/hustle-market-playtest.md`, covering bootstrap validation, daily rerolls, and acceptance/completion flows so every release can run through a repeatable script.

## Registry Loading
- `loadDefaultRegistry` now registers the canonical `ACTIONS` list (with `HUSTLE_TEMPLATES` derived automatically) so day-to-day market rolls no longer mutate the definitions.
- Tests cover: slice normalization, seeding, expiry rerolls, and delayed availability to protect future tuning changes.

## UI Surface Updates
- Hustle browser cards now list active commitments beneath each template, including payout callouts, logged-hours meters, and deadline countdown bars so you can triage multi-day gigs at a glance.
- Market offers render in the same cards as variant rows: ready offers headline a "Ready to accept" list with a matching accept CTA, while upcoming variants land in a dedicated "Coming tomorrow" queue with unlock timers.
- The finance dashboard separates hustle commitments from fresh offers, highlighting urgent deadlines with warning tones and mirroring the same progress meters for consistency.
- Hustle browser cards now offer a manual "Roll a fresh offer" button when a template has no active variants so players can nudge the market without relying on legacy instant runs.
- When manual rerolls are disabled (and no offers exist), hustle cards swap the queue button for a cheerful "Check back tomorrow" hint instead of falling back to hidden instant actions.
- Celebratory copy now leads the experience—"Fresh hustles just landed!"—whenever offers, upcoming slots, or commitments exist, only falling back to the quiet reroll language when the market is truly empty.
- DownWork's browser view now opens with a sticky capacity header (focus hours, accepted gigs, and potential payout), lane tabs for each hustle category, and quick filter pills (high payout, short tasks, skill XP, expiring soon) so players can plan their queue like a productivity board instead of scrolling a horizontal feed.
- DownWork's filter row now mirrors the hustle roster (Freelance Writing, SaaS Bug Squash, and friends) pulled straight from the market config so scouting a specific gig is just a single pill tap away.
- Dashboard quick actions surface active offers only. When the market is empty they present a "Check back tomorrow" guidance tile instead of invoking hidden instant-action fallbacks.
- Dashboard and browser surfaces group offers by template/variant, note multi-day commitments, and call out seat policies so limited cohorts feel tangible while category filters keep the grid organized.
- `createInstantHustle` exposes a `getPrimaryOfferAction()` helper (also mirrored on `definition.action.resolvePrimaryAction`) so tests and tooling can grab the current market offer or trigger a manual reroll, while production cards and quick actions rely exclusively on accepting offers from the market.
