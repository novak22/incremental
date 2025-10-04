# Content Authoring Cheatsheet

Use the schema helpers in `src/game/content/schema.js` so new definitions stay declarative and predictable.

- **Assets:** `createAssetDefinition(config)` handles setup, upkeep, quality, and payout strings. Provide only the unique numbers, flavor text, and optional detail keys.
- **Instant Hustles:** `createInstantHustle(config)` covers time, cost, payout, and hooks. Override copy or effects through `labels`, `onExecute`, or `onComplete`.
- **Upgrades:** `createUpgrade(config)` normalizes requirements and lock states. Supply bespoke button text with `labels` and effects via `onPurchase`.

Workflow: import the helper, pass the custom config, and append the result to the relevant export. Keeping data declarative makes balancing and localization painless.
