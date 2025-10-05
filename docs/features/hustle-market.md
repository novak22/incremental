# Hustle Market

## Goals
- Rotate daily hustle offerings without mutating the base registry so the UI can announce fresh opportunities each morning.
- Support limited-time or delayed offers that span multiple days, including variant-specific metadata.
- Persist market state so day transitions can detect whether a reroll is required or if existing contracts still apply.

## Template & Variant Structure
- All instant hustles continue to live in `HUSTLE_TEMPLATES` (alias `HUSTLES`) so the registry keeps a stable snapshot of every market-ready gig. Study tracks flow through the broader `ACTIONS` export but never appear in the daily market roll.
- Templates may define a `market` block with:
  - `variants`: optional array of variant configs (id, label, weight, duration, availableAfterDays, metadata, definitionId).
  - `durationDays` and `availableAfterDays`: defaults applied when variants omit explicit values.
  - `metadata`: extra properties merged into each offer.
- If no variants are provided the `rollDailyOffers` helper fabricates a default variant that mirrors the template.

## Rolling Logic
- `rollDailyOffers({ templates, day, now, state, rng })` clones any existing offers whose `expiresOnDay` is still in the future, then backfills missing templates by selecting a weighted variant (defaulting to equal weights).
- Each new offer captures:
  - `rolledOnDay`, `availableOnDay`, and `expiresOnDay` (duration is inclusive of the start day).
  - Variant metadata (id, label, description) plus merged template/variant metadata.
  - A deterministic `daysActive` array so UI layers can render availability windows.
- Offers are sorted by availability day then template id for consistent rendering.

## Persistence Helpers
- `ensureHustleMarketState` guarantees the `state.hustleMarket` slice exists with `{ lastRolledAt, lastRolledOnDay, offers: [] }`.
- Invalid timestamps or negative days clamp to safe defaults while malformed offers are sanitized (ensuring template/variant ids and day windows are valid).
- `createDefaultHustleMarketState`, `normalizeHustleMarketOffer`, `cloneHustleMarketState`, and `clearHustleMarketState` live alongside the ensure helper for future orchestration tools.

## Availability Queries
- `getAvailableOffers(state, { day, includeUpcoming })` returns a cloned list of active offers for the requested day. Setting `includeUpcoming: true` keeps offers whose availability window starts in the future (useful for dashboards showing "coming soon").
- Both helpers rely on the ensure function so consumers can call them without first seeding the slice manually.

## Registry Loading
- `loadDefaultRegistry` now registers the immutable template list (`HUSTLE_TEMPLATES`) so day-to-day market rolls no longer mutate the definitions.
- Tests cover: slice normalization, seeding, expiry rerolls, and delayed availability to protect future tuning changes.
