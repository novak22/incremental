# Hustle Market

## Goals
- Rotate daily hustle offerings without mutating the base registry so the UI can announce fresh opportunities each morning.
- Support limited-time or delayed offers that span multiple days, including variant-specific metadata and simultaneous variants when templates define multiple options.
- Persist market state so day transitions can detect whether a reroll is required or if existing contracts still apply.

## Template & Variant Structure
- All instant hustles continue to live in `HUSTLE_TEMPLATES` (alias `HUSTLES`) so the registry keeps a stable snapshot of every market-ready gig. Study tracks flow through the broader `ACTIONS` export but never appear in the daily market roll.
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

## Rolling Logic
- `rollDailyOffers({ templates, day, now, state, rng })` clones any existing offers whose `expiresOnDay` is still in the future, then fills the configured number of template slots by selecting weighted variants (defaulting to equal weights). Variant copy counts can consume multiple slots per roll while template and variant `maxActive` values prevent overfilling.
- Each new offer captures:
  - `rolledOnDay`, `availableOnDay`, and `expiresOnDay` (duration is inclusive of the start day).
  - Variant metadata (id, label, description) plus merged template/variant metadata.
  - Resolved requirements (`metadata.requirements.hours` and `metadata.hoursRequired`) and payout details (`metadata.payout.amount`, `metadata.payout.schedule`).
  - A deterministic `daysActive` array so UI layers can render availability windows.
- Offers are sorted by availability day, template id, variant id, and finally offer id for consistent rendering even when multiple copies share the same variant.

## Persistence Helpers
- `ensureHustleMarketState` guarantees the `state.hustleMarket` slice exists with `{ lastRolledAt, lastRolledOnDay, offers: [], accepted: [] }`.
- Invalid timestamps or negative days clamp to safe defaults while malformed offers are sanitized (ensuring template/variant ids and day windows are valid).
- `createDefaultHustleMarketState`, `normalizeHustleMarketOffer`, `cloneHustleMarketState`, and `clearHustleMarketState` live alongside the ensure helper for future orchestration tools. Accepted offers are normalized into `accepted` entries so expired claims are pruned automatically and the corresponding offers are marked as `claimed`.

## Acceptance Flow
- `acceptHustleOffer(offerId, { state })` reads the offer metadata, accepts an action instance through `acceptActionInstance`, marks the offer as claimed, and records an accepted entry with `acceptedOnDay`, `deadlineDay`, required hours, and payout schedule.
- Progress metadata is piped directly into `acceptActionInstance` so accepted entries inherit `hoursPerDay`, `daysRequired`, and manual completion flags. The todo queue uses these hints to compute step hours and keeps manual tasks visible even when hour goals are satisfied.
- Claimed offers continue to persist until their deadlines elapse so completion logging and payout scheduling remain traceable.

## Availability Queries
- `getAvailableOffers(state, { day, includeUpcoming, includeClaimed })` returns a cloned list of active offers for the requested day. Setting `includeUpcoming: true` keeps offers whose availability window starts in the future (useful for dashboards showing "coming soon"). Passing `includeClaimed: true` allows UI layers to render offers that have been claimed but not yet completed.
- `getClaimedOffers(state, { day, includeExpired })` surfaces accepted entries so panels can highlight in-progress contracts separate from fresh opportunities.
- Both helpers rely on the ensure function so consumers can call them without first seeding the slice manually.

## Registry Loading
- `loadDefaultRegistry` now registers the immutable template list (`HUSTLE_TEMPLATES`) so day-to-day market rolls no longer mutate the definitions.
- Tests cover: slice normalization, seeding, expiry rerolls, and delayed availability to protect future tuning changes.

## UI Surface Updates
- Hustle browser cards now list active commitments beneath each template, including payout callouts, logged-hours meters, and deadline countdown bars so you can triage multi-day gigs at a glance.
- Market offers render in the same cards as variant rows: available offers get bright accept buttons while upcoming variants show unlock timers and remain disabled until their window opens.
- The finance dashboard separates hustle commitments from fresh offers, highlighting urgent deadlines with warning tones and mirroring the same progress meters for consistency.
- Hustle browser cards now offer a manual "Roll a fresh offer" button when a template has no active variants so players can nudge the market without relying on legacy instant runs.
- When manual rerolls are disabled, hustle cards swap the queue button for a cheerful "Check back tomorrow" hint instead of falling back to hidden instant actions.
- Dashboard quick actions surface active offers only. When the market is empty they present a "Check back tomorrow" guidance tile instead of invoking hidden instant-action fallbacks.
- `createInstantHustle` still exposes an `action.onClick` for tests and tooling, but it is flagged with `isLegacyInstant`/`hiddenFromMarket` and UI layers ignore it when building hustle cards or quick actions so production surfaces depend exclusively on offer acceptance.
