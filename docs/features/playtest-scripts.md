# Playtest Scripts

Use these condensed checklists to keep regression passes consistent. Each script links to the live systems for deeper debugging when something drifts.

## Hustle Market Exchange
_Source modules: `src/game/hustles/market.js`, `src/game/hustles/definitions/instantHustles.js`_

### Setup
1. Start from a fresh browser session so bootstrap rolls the day-one offers.
2. Open the developer console and keep the `window.__HUSTLE_MARKET_DEBUG__` helpers visible.

### Day 1 – Bootstrap
- Confirm every hustle template with same-day variants shows at least one active offer.
- Run `window.__HUSTLE_MARKET_DEBUG__.printAuditLog()` and verify a single roll entry exists with non-zero `created` counts.
- Accept a short contract, log the required hours, and confirm the payout hits immediately before the offer archives.

### Day 2 – Rerolls
- End the day and inspect `printOffers()`.
- Expected: multi-day offers accepted on Day 1 persist; new variants backfill open slots; audit log tracks preserved vs. created offers.
- Accept a multi-day contract but only complete part of the workload; ensure the offer remains active with updated progress.

### Day 3 – Expiry & Completion
- End the day again.
- Confirm expired offers disappear and multi-day commitments remain until resolved.
- Finish the in-progress contract and confirm the payout and audit log entry reflect completion timing.

### Telemetry Spot-Checks
- `getMarketRollAuditLog()` should only list `skipped` reasons when capacity is maxed.
- `window.__HUSTLE_MARKET_AUDIT__` should stay under 30 entries during extended sessions.

### Sign-Off
- Capture the final audit snapshot and attach it to the QA notes for the release.

## Session Switcher Guardrails
_Source modules: `src/core/persistence/sessionRepository.js`, `src/ui/headerAction/sessionSwitcher.js`_

1. **Create a session** – Start a new slot, confirm the game reloads into Day 1, and note the success toast.
2. **Switch sessions** – With two slots, perform an action, activate the secondary slot, and confirm the previous slot autosaves before the UI reloads with updated timestamps.
3. **Delete a session** – Remove a non-active slot, ensure the entry disappears, and verify the active pill keeps the correct last-saved timestamp.
