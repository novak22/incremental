# Changelog

## Unreleased
- Knowledge study tracks now spawn manual study actions; log hours yourself to advance days and earn completion rewards, with migrated saves seeding pending sessions for existing enrollments.
- Action progress now records per-day hours, supports deferred completions, and exposes helpers for advancing or resetting in-flight hustles.
- Unified instant hustles and study sessions under a shared action registry that tracks accepted instances, daily limits, and
  completion history without erasing legacy hustle progress.
- Hustle market rolls daily offers from immutable templates, tracks multi-day availability, and persists timestamps for clean day rollovers.
- TODO/action queue now runs through the shared action-provider registry so dashboard widgets and TimoDoro stay aligned, and the landing page no longer swallows the default workspace when tasks populate mid-load.
- Browser shell keeps the tabbed chrome, notification bell, and modular stylesheets; add new surfaces by pairing a presenter with a stylesheet.
- Home dashboard stays focused on the three core widgets (ToDo, cash snapshot, app tiles) with drag-to-arrange and End Day gating.
- Workspace roster (BankApp, Learnly, Shopily, VideoTube, DigiShelf, ServerHub) shares KPI grids, detail panes, and launch confirmations.
- Content tracks lean on schema builders for courses, upgrades, and passive assets; boosts and events reuse the shared multi-day engine.
- Passive income, education, and hustles remain tuned around upkeep-first scheduling so players stay in control of daily hours.
- Routine hustle payouts and quality work logs now auto-dismiss so the notification bell spotlights urgent alerts.
- ShopStack workspace trims unused detail builders—`buildDetailView` and the old `detailBuilders.js` helper are gone, with `detail/index.js` re-exporting the focused helpers directly.
- Quality actions across passive assets can now spark upbeat celebration events that grant short-lived payout boosts.

## Recent Highlights
- Passive assets gained Quality 4–5 payout milestones with clearer upkeep cues.
- Education and hustle bonuses announce their links directly on course and task cards.
- Dashboard upgrades centralize upgrade prompts, daily stats, and schedule messaging.
