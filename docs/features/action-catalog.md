# Action Catalog & Debug Panel

## Goals
- Provide a single source of truth for actionable content (hustles, asset launches, quality pushes, upgrades) so future systems can reuse shared data.
- Surface requirement, time, and money availability in a developer-facing panel for quicker tuning and balancing.
- Prepare groundwork for player-facing features such as action search, category filters, or smart recommendations.

## Player / Developer Impact
- Players do not see the debug panel, but they will benefit from more consistent requirement handling across cards as the catalog powers upcoming UI.
- Developers gain a live dashboard (toggle via `?debugActions=1` or `#debug-actions`) listing every action, its availability, and unmet gates for faster iteration.

## Tuning Notes
- Catalog entries compute availability using shared selectors that respect time, money, prerequisites, cooldowns, and daily limits.
- Debug rows highlight missing resources (time, cash, requirements) in orange to spotlight balancing issues.
- The catalog API (`listCatalog`, `listAvailableActions`) accepts filters for future panels that may target specific categories (e.g., instant-only hustles or long-form quality work).
