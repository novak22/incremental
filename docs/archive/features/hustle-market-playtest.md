# Hustle Market Playtest Script

## Goals
- Confirm the contract exchange populates at bootstrap without manual rerolls.
- Verify daily rerolls preserve in-flight offers, expire contracts that run out of days, and backfill open slots.
- Exercise acceptance, progress logging, and completion so payouts and audit logs reflect the live schedule.

## Test Setup
1. Load the game in a fresh browser session (cleared storage) so bootstrap runs.
2. Open the developer console and keep it visible; the debug helpers log telemetry to aid verification.
3. Optional: call `window.__HUSTLE_MARKET_DEBUG__.printOffers()` after each major step to snapshot the market state.

## Day 1 — Bootstrap Verification
1. Observe the hustle board immediately after load. Expected: at least one active offer per template with variants available today.
2. In the console, run `window.__HUSTLE_MARKET_DEBUG__.printAuditLog()` to confirm a single roll entry exists for the current in-game day with non-zero `created` offers.
3. Accept one short-duration offer (e.g., a rush freelance gig) and log the required hours to complete it. Confirm the payout hits immediately and the offer moves to the claimed archive.

## Day 2 — Reroll & Persistence
1. End the day.
2. On the new day, run `window.__HUSTLE_MARKET_DEBUG__.printOffers()`.
   - Expected: contracts accepted yesterday persist if they have remaining days.
   - New variants appear to fill any open slots; the audit log lists the new roll with preserved vs. created counts.
3. Accept a multi-day contract (e.g., Dropship subscription assembly) but only log part of the required hours. Confirm the offer remains available with updated progress metadata.

## Day 3 — Expiry & Cleanup
1. End the day again.
2. Review the offers via the debug helper.
   - Contracts that reached their final day should drop from the active list.
   - Multi-day commitments accepted on Day 2 should remain until completion or expiry.
3. Complete the in-progress multi-day contract and verify the payout schedule and audit log entry reflect the completion.

## Telemetry Spot-Checks
- After each roll, use `getMarketRollAuditLog()` (or the console helper) to ensure `skipped` reasons only appear when max-active or variant capacities are reached.
- Confirm `window.__HUSTLE_MARKET_AUDIT__` never grows beyond 30 entries during extended playtests.

## Sign-Off
- When all checks pass, capture the final audit log snapshot and attach it to the QA notes for the release.
