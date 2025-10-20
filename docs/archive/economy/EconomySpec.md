# Economy Specification

## Dataset Overview
The authoritative economy dataset is `docs/normalized_economy.json`, tagged as Phase 1 and documenting canonical values derived from the earlier economy reference. All timing values are stored in minutes and all currency values in USD to keep downstream tooling consistent.【F:docs/normalized_economy.json†L2-L8】

## Structural Overview
### Passive Assets
Six passive ventures — blogs, e-books, vlogs, stock photo galleries, dropshipping labs, and micro SaaS platforms — enumerate base income, variance, setup cadence, upkeep, quality ladders, gating requirements, and thematic tags for each asset type.【F:docs/normalized_economy.json†L10-L499】

### Instant Hustles
The hustle catalog lists each instant action with its execution time, cash cost, payout, optional daily limit, prerequisite assets, and skill focus tags so balance passes can trace every short-term money source.【F:docs/normalized_economy.json†L502-L775】

### Knowledge Tracks
Education tracks describe their study schedules (days × minutes per day), tuition, and XP rewards including multi-skill splits, providing the definitive progression requirements used by scheduling and reward systems.【F:docs/normalized_economy.json†L777-L1210】

### Upgrades
Upgrade entries capture purchase costs, repeatability, categories, requirement chains, and any descriptive notes that modify assets, hustles, or global pacing levers.【F:docs/normalized_economy.json†L1249-L1715】

## Key Formulas & Timing Data
- Every asset defines `base_income` and a fractional `variance`, while quality tiers supply per-level min/max payouts and milestone requirements that scale earnings over time.【F:docs/normalized_economy.json†L12-L406】
- Asset and hustle actions rely on minute-level `setup_time` values alongside structured schedules (`setup_days` × `setup_minutes_per_day`) to express multi-day buildouts or single-run action lengths.【F:docs/normalized_economy.json†L15-L83】【F:docs/normalized_economy.json†L237-L406】【F:docs/normalized_economy.json†L503-L775】
- Daily upkeep draws on explicit `maintenance_time`/`maintenance_cost` pairs so passive streams can be budgeted alongside hustle opportunities.【F:docs/normalized_economy.json†L17-L331】
- Hustles expose optional `daily_limit` caps and requirement arrays that drive scheduling logic for scarcity-bound gigs.【F:docs/normalized_economy.json†L512-L775】
- Knowledge tracks contribute study pacing (`minutes_per_day`) and XP splits (`skill_split`) to feed player progression curves.【F:docs/normalized_economy.json†L787-L1120】
- Upgrade purchases are priced through `setup_cost` and often annotated with notes explaining derived effects such as bonus minutes or repeatability limits.【F:docs/normalized_economy.json†L1250-L1323】

## Modifier Taxonomy
The modifier list normalizes how bonuses apply across the economy: multipliers scale incomes, progress, or timings; flat adjustments add deterministic payouts; and additive effects extend state values such as time bonuses.【F:docs/normalized_economy.json†L1727-L2154】 Targets span assets, hustles, state resources, and tag-based groups, ensuring every economy lever is discoverable from a single catalog.【F:docs/normalized_economy.json†L1727-L2154】

## Appendix & Regeneration
`docs/EconomySpec.appendix.md` stores auto-generated tables and charts derived from the normalized dataset and the modifier graph generator. Run `npm run rebuild-economy-docs` whenever constants change to refresh the appendix and update supporting diagrams.【F:scripts/rebuildEconomyDocs.mjs†L1-L286】
