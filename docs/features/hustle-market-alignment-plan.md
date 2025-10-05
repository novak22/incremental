# DownWork Hustle Market Alignment Plan

## Vision Recap
- Deliver a "Hustle Exchange" that reliably presents fresh, curiosity-sparking gigs every in-game morning.
- Ensure the market feels active by default so players see offers without manual rerolls.
- Celebrate progress with upbeat copy and clear calls to action across hustle cards.

## Status Update
- [x] **Seed Daily Offers on Load** – `ensureRegistryReady` now guarantees `ensureDailyOffersForDay` runs during bootstrap, rolling offers whenever the slice is empty and preserving prior-day contracts when saves are reloaded.【F:src/game/registryBootstrap.js†L1-L44】【F:src/game/hustles.js†L19-L64】
- [x] **Schedule Automatic Daily Rerolls** – The day-cycle (`endDay`) calls the same helper so each sunrise clones unexpired contracts, expires finished ones, and fills empty slots.【F:src/game/lifecycle.js†L1-L75】【F:src/game/hustles.js†L19-L64】
- [x] **Offer Persistence Visibility** – Hustle definitions now publish variant metadata (hours per day, duration, payout schedule, copies) ensuring the exchange always has market-ready contracts instead of legacy instant runs.【F:src/game/hustles/definitions/instantHustles.js†L19-L855】
- [x] **Telemetry & QA Tooling** – Market rolls feed `getMarketRollAuditLog()`, expose `window.__HUSTLE_MARKET_DEBUG__` helpers, and the playtest script in `docs/features/hustle-market-playtest.md` gives QA a repeatable checklist for bootstrap, rerolls, and contract completion.【F:src/game/hustles/market.js†L12-L210】【F:src/game/hustles/market.js†L662-L755】【F:docs/features/hustle-market-playtest.md†L1-L64】
- [x] **Documentation Refresh** – Economy notes describe the contract market and variant catalog, while the main hustle feature doc now references telemetry hooks and debug helpers for designers.【F:docs/economy.md†L80-L121】【F:docs/features/hustle-market.md†L1-L126】

## Acceptance Criteria
- Players see at least one active offer per eligible template without taking any manual action when they start a session.
- Advancing the in-game day consistently updates the market with new offers while honoring any ongoing commitments.
- UI messaging reinforces the active marketplace loop and only falls back to reroll guidance when the registry genuinely has nothing to offer.
- Test suites cover bootstrap seeding, daily rerolls, and UI rendering states for offers, upcoming gigs, and empty markets.
- Manual QA checklist is documented and referenced in commit/PR notes during rollout.
