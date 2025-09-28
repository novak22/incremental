# Content Authoring Guide

Designers can configure new hustles, assets, and upgrades without writing imperative logic by using the schema builders in `src/game/content/schema.js`. The builders normalize metadata, inject default UI details, and wire runtime hooks used by the lifecycle systems.

## Available Builders

- `createAssetDefinition(config)` – Produces a full asset definition from declarative data. Standard details (owned count, setup, maintenance, quality, and yield summaries) are injected automatically. Provide `detailKeys` to reorder or extend the default stack and `actionLabels` to customize card CTA copy.
- `createInstantHustle(config)` – Creates instant or delayed hustles. Supply `time`, `cost`, `payout`, and optional `requirements`. Metrics labels, payout copy, and requirement summaries are generated for you. Hook custom logic with `onExecute`/`onComplete` callbacks.
- `createUpgrade(config)` – Generates purchase or repeatable upgrades. Costs, requirement details, and lock states are standardized. Use `labels` for dynamic button text, `metrics` for custom telemetry labels, and `onPurchase` to trigger special behavior.

## Adding New Content

1. Import the relevant builder inside the target module (e.g., `src/game/assets/definitions/` for assets or `src/game/upgrades.js` for upgrades).
2. Pass a plain object describing the content. Only include unique flavor text, numerical tuning, and any bespoke hooks.
3. Append the created definition to the exported array (`ASSETS`, `HUSTLES`, or `UPGRADES`).
4. Optional: Provide supplemental detail functions or card state overrides when a design calls for bespoke messaging.

The builders ensure consistent formatting, metrics tracking, and UI behavior so designers can focus on storytelling and balance.
