# Visits Simulation Prototype

## Overview
The visits system models audience traffic for assets using the same economic plumbing that powers daily payouts. Every qualifying asset produces a projected daily visit total derived from its quality range, upgrades, niche multipliers, events, and education bonuses. Those visits accumulate continuously as in-game hours pass and roll into lifetime reach at daybreak.

## Goals
- Mirror the passive income economy with a parallel audience metric that feels responsive as time advances.
- Keep the implementation modular so future assets can opt in without touching money logic.
- Preserve existing payout behaviour while reusing the same modifiers, events, and upgrade hooks.

## Player Impact
- BlogPress dashboards can surface daily visit progress that climbs in real time while upkeep is funded.
- End-of-day recaps now have matching visit totals, reinforcing how maintenance hours translate into reach.
- Lifetime visit counters unlock future tuning levers (ad tiers, sponsorship gates) without rebalancing payouts.

## Simulation Details
- Visits are calculated from the average of the current quality payout range, piped through the shared modifier stack in `src/game/assets/payout.js`.
- Hourly accumulation divides the projected daily visits by the 14-hour schedule so partial days contribute proportionally.
- Daily visit progress, active breakdowns, and lifetime totals live inside each asset instance’s `metrics` object to persist across saves.
- `accumulateAssetVisits` hooks into `spendTime` and the day rollover sequence so skipped hours still award the remaining visits.

## Future Work
- Extend the simulator to other audience-facing assets (vlogs, SaaS) once their visit formulas are defined.
- Surface visit breakdowns inside BlogPress detail panels alongside the existing payout history.
- Attach milestone perks or upgrade requirements to lifetime visit thresholds once balancing data is available.
