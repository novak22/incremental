# Content Schema Builders

## Goal
Provide a declarative pipeline so new hustles, assets, and upgrades can be described entirely through configuration objects. The builders ensure consistent UI rendering, action wiring, and metrics tracking while reducing copy-pasted logic across modules.

## Player Impact
- Faster iteration on new content keeps the game fresh without risking regressions in core systems.
- Consistent card layouts, requirement messaging, and action behavior make each addition feel polished and predictable.
- Designers can tune payouts, costs, and requirements directly, enabling more frequent balancing updates.

## Tuning Parameters
- `createInstantHustle`: adjust `time`, `cost`, `payout.amount`, `payout.delaySeconds`, and `requirements` arrays to define effort and rewards.
- `createAssetDefinition`: modify `setup`, `maintenance`, `income`, and `quality.levels` to shape passive production arcs.
- `createUpgrade`: set `cost`, `requires`, and `labels` for pacing, and use `onPurchase` callbacks for custom effects.
