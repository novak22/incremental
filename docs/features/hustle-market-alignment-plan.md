# DownWork Hustle Market Alignment Plan

## Vision Recap
- Deliver a "Hustle Exchange" that reliably presents fresh, curiosity-sparking gigs every in-game morning.
- Ensure the market feels active by default so players see offers without manual rerolls.
- Celebrate progress with upbeat copy and clear calls to action across hustle cards.

## Current Gaps
1. **Empty Initial State** – The market state is not rolled at session start, so cards fall back to "No hustles ready yet" and only show the manual reroll CTA.
2. **Lack of Daily Refresh** – There is no automated daily reroll to repopulate the market when the in-game day advances.
3. **Offer Persistence Visibility** – Accepted offers and pending commitments are not surfaced prominently on load, so the marketplace feels static.
4. **Playtest Coverage** – Manual QA expectations are unmet; there is no repeatable checklist to verify that the hustle loop runs end-to-end after each change.

## Task Breakdown

### 1. Seed Daily Offers on Load
- Hook `loadDefaultRegistry` / game bootstrap to call `ensureHustleMarketState` and `rollDailyOffers` when the market is empty.
- Guard against duplicate rolls by checking `state.hustleMarket.lastRolledOnDay` and the current in-game day before rolling.
- Write unit coverage that fakes the bootstrap to prove the initial state populates at least one offer per template configured with `slotsPerRoll`.

### 2. Schedule Automatic Daily Rerolls
- Extend the day transition pipeline to reroll the market when the player advances to a new day.
- Preserve active multi-day offers by cloning those that have not expired, matching the existing `rollDailyOffers` expectations.
- Add regression tests to confirm that rerolls respect `availableAfterDays`, duration windows, and `maxActive` limits.

### 3. Refresh UI Defaults
- Update DownWork hustle cards to:
  - Prefer rendering the first available offer with an "Accept" CTA instead of the fallback reroll button.
  - Show upcoming offers (those with `availableOnDay > today`) in a "Coming Tomorrow" list to reinforce the rotating market.
  - Surface accepted commitments in a dedicated section with progress meters and payout badges so the exchange feels alive on load.
- Add celebratory copy for the primary card state (e.g., "Fresh hustles just landed!") that only falls back to reroll language when the market is truly empty.
- Create snapshot/component tests to cover the accept CTA priority and the empty-state fallback.

### 4. Author Tooling & Telemetry Hooks
- Log market rolls (day, number of offers, templates skipped) so designers can audit daily variety.
- Expose a debug panel entry that lists current offers and their expiry to simplify tuning during playtests.
- Document how to trigger rerolls manually for QA in `docs/features/hustle-market.md` or a companion doc.

### 5. QA & Documentation
- Draft a manual playtest script covering: initial load, daily rollover, accepting an offer, completing it, and verifying the next day's refresh.
- Update `docs/changelog.md` with the new hustle market behavior once implemented.
- Refresh `README.md` instructions for accessing the Hustle Exchange and expectations for daily offers.

## Acceptance Criteria
- Players see at least one active offer per eligible template without taking any manual action when they start a session.
- Advancing the in-game day consistently updates the market with new offers while honoring any ongoing commitments.
- UI messaging reinforces the active marketplace loop and only falls back to reroll guidance when the registry genuinely has nothing to offer.
- Test suites cover bootstrap seeding, daily rerolls, and UI rendering states for offers, upcoming gigs, and empty markets.
- Manual QA checklist is documented and referenced in commit/PR notes during rollout.
