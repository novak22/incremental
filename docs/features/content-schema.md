# Content Schema Builders

**Why they exist**
- Designers define hustles, passive assets, and upgrades with plain objects so UI, requirements, and metrics stay consistent.

**Builder cheatsheet**
- `createInstantHustle`: set `time`, `cost`, `payout` (amount + delay), and `requirements` to shape quick or delayed gigs.
- `createAssetDefinition`: provide `setup`, `maintenance`, `income`, and `quality.levels` to map long-term arcs.
- `createUpgrade`: configure `cost`, `requires`, optional `labels`, and `onPurchase` hooks for special effects.

**Player upside**
- Faster iteration keeps card layouts, copy, and availability rules aligned while we ship new content.
