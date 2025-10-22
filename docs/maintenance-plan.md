# Maintenance Snapshot

- **Loop basics:** Players budget hours across hustles, upkeep, automation, and study. Morning automation reserves upkeep first so the day never starts broken.
- **Top chores:** Keep `npm install && npm test` green, document onboarding steps, and keep gameplay definitions separate from engine logic.
- **Player promises:** New content should respect upkeep prioritization, surface ledger updates, and leave designers free to tweak numbers without touching runtime code.
- **Economy updates:** When economy constants move, refresh `docs/normalized_economy.json`, update any impacted rows in `docs/economy-quickref.md`, and regenerate optional charts locally before archiving them under `docs/archive/economy_sim_report_assets/` if needed.

## UI Data Selectors

- Reach for the selectors in `src/ui/selectors/` when UI modules need game state, registry definitions, or asset helpers. The façade keeps view logic from reaching deep into `src/core/` or `src/game/`.
- Add focused selector functions instead of expanding component imports; each helper should return ready-to-render data and avoid mutating the live state snapshot.
- When selectors need new game data, compose them from existing helpers in `src/game/` so runtime rules stay centralized while the UI consumes a narrow surface.
