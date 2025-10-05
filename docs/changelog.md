# Changelog

## Unreleased
- Tooling: Added a Streamlit balancing workbench (`tools/balancingWorkbench/`) with live sliders, ROI charts, and PNG exports to accelerate economy tuning sessions.
- Tooling: Balancing workbench can now simulate multi-asset lineups and upgrade combos, with a handy summary of setup hours, upkeep, and bonus time.
- Governance: Gameplay PRs that adjust economy constants must update `docs/EconomySpec.md`, rerun `npm run rebuild-economy-docs`, and attach the refreshed appendix before review.
- Knowledge study tracks now spawn manual study actions; log hours yourself to advance days and earn completion rewards, with migrated saves seeding pending sessions for existing enrollments.
- Action progress now records per-day hours, supports deferred completions, and exposes helpers for advancing or resetting in-flight hustles.
- Unified instant hustles and study sessions under a shared action registry that tracks accepted instances, daily limits, and
  completion history without erasing legacy hustle progress.
- Hustle market rolls daily offers from immutable templates, tracks multi-day availability, and persists timestamps for clean day rollovers.
- Hustle market offers now expose per-variant requirements and payout metadata, support simultaneous variants, and surface claimed-contract selectors via the new `acceptHustleOffer` helper.
- TODO/action queue now runs through the shared action-provider registry so dashboard widgets and TimoDoro stay aligned, and the landing page no longer swallows the default workspace when tasks populate mid-load.
- Browser shell keeps the tabbed chrome, notification bell, and modular stylesheets; add new surfaces by pairing a presenter with a stylesheet.
- Home dashboard stays focused on the three core widgets (ToDo, cash snapshot, app tiles) with drag-to-arrange and End Day gating.
- Workspace roster (BankApp, Learnly, Shopily, VideoTube, DigiShelf, ServerHub) shares KPI grids, detail panes, and launch confirmations.
- Content tracks lean on schema builders for courses, upgrades, and passive assets; boosts and events reuse the shared multi-day engine.
- Passive income, education, and hustles remain tuned around upkeep-first scheduling so players stay in control of daily hours.
- Routine hustle payouts and quality work logs now auto-dismiss so the notification bell spotlights urgent alerts.
- ShopStack workspace trims unused detail builders—`buildDetailView` and the old `detailBuilders.js` helper are gone, with `detail/index.js` re-exporting the focused helpers directly.
- Quality actions across passive assets can now spark upbeat celebration events that grant short-lived payout boosts.
- Hustle-facing UIs surface accepted commitments with progress meters, highlight variant expiries, and keep quick actions populated even when the market has no fresh offers.
- Niche popularity now syncs with active trend events, keeping multipliers, history, and analytics aligned across saves.
- Niche trend events now stretch across 5–10 days, building from gentle nudges to pronounced peaks (or dips) so players can react to the swelling momentum.
- Tooling: Added a `?view=developer` state explorer that surfaces the live memory snapshot, active random events, and long-term buff sources for faster balancing passes.
- Niche trend rerolls now guarantee every niche is always riding exactly one weighted event, including immediately after loads and daily advances.

## Recent Highlights
- Passive assets gained Quality 4–5 payout milestones with clearer upkeep cues.
- Education and hustle bonuses announce their links directly on course and task cards.
- Dashboard upgrades centralize upgrade prompts, daily stats, and schedule messaging.
