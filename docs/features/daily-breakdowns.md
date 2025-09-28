# Daily Metrics Ledger

## Goals
- Replace placeholder snapshot text with real data sourced from player actions each in-game day.
- Give players an immediate sense of where their hours, earnings, and cash outflows went without digging through the activity log.
- Provide designers a single place to plug in additional categories (e.g., automation refunds, seasonal boosts) as the economy expands.

## Player Impact
- The Daily Snapshot panel now celebrates progress with concrete figures: total time invested, money earned, passive income streams, cash spent, and study momentum.
- Hustle bursts, passive payouts, upkeep, and one-off investments appear in the breakdown lists as soon as they happen, helping players cross-check their plan against results.
- Day transitions briefly surface the prior day’s totals before resetting, so players can review earnings before diving into the next loop.
- Passive earnings now surface their contributing assets (with instance counts) directly in the snapshot caption so players can confirm which builds carried the day.

## Tuning Parameters
- **Metric Categories** – Time: `setup`, `maintenance`, `hustle`, `study`, `general`. Earnings: `passive`, `offline`, `hustle`, `delayed`, `sale`. Spending: `maintenance`, `payroll`, `setup`, `investment`, `upgrade`, `consumable`.
- **UI Copy** – Captions summarise the dominant categories (setup vs. upkeep, passive vs. active, upkeep vs. investments). Adjust strings in `src/ui/dashboard.js` if new categories should surface.
- **Reset Timing** – `resetDailyMetrics` is triggered inside `endDay` after the final summary update and before new-day allocations. If the cadence of automatic maintenance changes, revisit that timing to ensure fresh days start clean.
- **Formatting Helpers** – Breakdown rows format hours via `formatHours` and cash via `formatMoney`. Update these helpers if you tweak rounding or currency presentation.
