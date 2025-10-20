# Maintenance Snapshot

- **Loop basics:** Players budget hours across hustles, upkeep, automation, and study. Morning automation reserves upkeep first so the day never starts broken.
- **Top chores:** Keep `npm install && npm test` green, document onboarding steps, and keep gameplay definitions separate from engine logic.
- **Player promises:** New content should respect upkeep prioritization, surface ledger updates, and leave designers free to tweak numbers without touching runtime code.
- **Economy updates:** When economy constants move, refresh `docs/normalized_economy.json`, update any impacted rows in `docs/economy-quickref.md`, and regenerate optional charts locally before archiving them under `docs/archive/economy_sim_report_assets/` if needed.
