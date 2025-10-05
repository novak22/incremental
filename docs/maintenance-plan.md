# Maintenance Snapshot

- **Loop basics:** Players budget hours across hustles, upkeep, automation, and study. Morning automation reserves upkeep first so the day never starts broken.
- **Top chores:** Keep `npm install && npm test` green, document onboarding steps, and keep gameplay definitions separate from engine logic.
- **Player promises:** New content should respect upkeep prioritization, surface ledger updates, and leave designers free to tweak numbers without touching runtime code.
- **Economy updates:** After changing any economy constants or modifiers, run `npm run rebuild-economy-docs` to refresh the spec appendix and graphs.
