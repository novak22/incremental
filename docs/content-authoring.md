# Content Authoring Guide

Designers shape new hustles, assets, and upgrades through the schema builders in `src/game/content/schema.js`. The helpers inject default copy, metrics wiring, and UI hooks so data stays declarative while runtime systems stay consistent.

## Core Builders
- `createAssetDefinition(config)` — Defines a passive asset with setup, upkeep, quality, and payout summaries. Extend detail stacks with `detailKeys` or tweak call-to-action copy with `actionLabels`.
- `createInstantHustle(config)` — Captures instant hustles with time, cost, payout, and optional requirements. Use `onExecute` / `onComplete` for bespoke logic without skipping standard formatting.
- `createUpgrade(config)` — Produces purchase or repeatable upgrades, normalizing requirements, lock states, and telemetry labels. Customize button text with `labels` and hook effects with `onPurchase`.

## Workflow
1. Import the relevant builder in the destination module (assets, hustles, or upgrades).
2. Pass only the unique tuning, flavor text, and optional hooks for the new content.
3. Append the created definition to the exported collection so the loop picks it up.

Keeping content declarative makes balancing, localization, and experimentation faster for the whole team.
