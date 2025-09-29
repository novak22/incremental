# Day-Driven Asset Loop

## Goals
- Shift passive income from real-time ticks to in-world days so payouts hinge on player-controlled day advancement.
- Support multiple instances per asset with multi-day setup phases and daily maintenance costs.
- Introduce requirement types (equipment, knowledge, experience) to pace expansion and highlight supporting systems like study tracks.

## Player Impact
- Players choose when to invest daily hours into setup, upkeep, and study, creating a stronger planning mini-game each morning.
- Daily recap logs clarify which assets paid out, which stalled, and which knowledge tracks advanced, helping players course-correct.
- New knowledge hustles provide deterministic paths to unlock late-game assets without random drops or grindy loops.

## Key Systems & Tuning
- **Asset Scheduling** – Each asset definition includes `setup.days`, `setup.hoursPerDay`, and `maintenance` requirements (hours plus optional cash cost). Setup time is auto-reserved at day start when hours are available; upkeep only proceeds when you have both time and the required maintenance budget.
- **Daily Income Curves** – Assets roll payouts using `income.base` with a per-asset variance. Example ranges (assuming top-tier quality bonuses when available):
  - Blog: base 70, ±25% variance (modifier: +50% with Automation Course).
  - Vlog: base 140, ±35% variance.
  - Stock Photos: base 95, ±45% variance.
  - Dropshipping: base 260, ±50% variance.
  - SaaS: base 620, ±60% variance, reaching $82–$110/day at Quality 4 once the Edge Delivery Network is live.
- **Instance State** – Each instance tracks `status`, `daysRemaining`, `daysCompleted`, `setupFundedToday`, `maintenanceFundedToday`, `lastIncome`, and `totalIncome` for log messaging and UI summaries.
- **Requirements** – Assets can require:
  - Equipment upgrades (e.g., Camera, Lighting Kit, Cinema Camera, Studio Expansion, Cloud Cluster, Edge Delivery Network).
  - Knowledge tracks (Outline Mastery 3×2h, Photo Catalog 2×1.5h, E-Commerce Playbook 5×2h, Automation Architecture 7×3h).
  - Experience (e.g., Dropshipping needs 2 active blogs; SaaS needs Cloud Cluster infrastructure, 1 dropshipping store, and 1 e-book).
- **Knowledge Tracks** – New study hustles mark `studiedToday` and advance one day of progress at day end; skipping a day after starting generates a warning log.

## Open Questions / Next Steps
- Balance passives for mid/late game pacing after more assets arrive (e.g., check if SaaS variance feels fair, especially post-Edge rollout).
- Monitor late-game balance around the new SaaS Quality 4 tier and verify the Edge deployment action cadence keeps the track feeling special without dragging pacing.
- Add UI affordances for prioritising which setups should receive limited hours when time is sparse.
- Consider prestige or weekly reset hooks once players automate the full catalog.
