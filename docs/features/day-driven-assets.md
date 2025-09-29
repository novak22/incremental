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
- **Daily Income Curves** – Assets roll payouts using `income.base` with a per-asset variance. Example ranges:
  - Blog: base 30, ±20% variance (modifier: +50% with Automation Course).
  - Vlog: base 140, ±35% variance.
  - Stock Photos: base 95, ±45% variance.
  - Dropshipping: base 260, ±50% variance.
  - SaaS: base 620, ±60% variance.
- **Recent Early-Game Tuning (September 2025)** – Blog and E-Book definitions were rebalanced so the first quality tiers fund their own upkeep after a few actions.
  - Blogs now reserve 0.75h and $3/day for upkeep, earn $3–$6 at Quality 0 and $9–$15 at Quality 1, and need only 3/9 posts for the first two quality jumps (Automation Course still doubles post progress, keeping the perk valuable).
  - E-Books retain their 0.75h/$3 upkeep but reach $12–$20/day at Quality 1 thanks to faster chapter drafting (2.5h per chapter) and cheaper support actions, making the Outline Mastery workshop unlock feel worthwhile immediately.
- **Instance State** – Each instance tracks `status`, `daysRemaining`, `daysCompleted`, `setupFundedToday`, `maintenanceFundedToday`, `lastIncome`, and `totalIncome` for log messaging and UI summaries.
- **Requirements** – Assets can require:
  - Equipment upgrades (e.g., Camera, Lighting Kit, Cinema Camera, Studio Expansion, Cloud Cluster).
  - Knowledge tracks (Outline Mastery 3×2h, Photo Catalog 2×1.5h, E-Commerce Playbook 5×2h, Automation Architecture 7×3h).
  - Experience (e.g., Dropshipping needs 2 active blogs; SaaS needs Cloud Cluster infrastructure, 1 dropshipping store, and 1 e-book).
- **Knowledge Tracks** – New study hustles mark `studiedToday` and advance one day of progress at day end; skipping a day after starting generates a warning log.

## Open Questions / Next Steps
- Balance passives for mid/late game pacing after more assets arrive (e.g., check if SaaS variance feels fair).
- Add UI affordances for prioritising which setups should receive limited hours when time is sparse.
- Consider prestige or weekly reset hooks once players automate the full catalog.

## Manual Test Coverage
- 2025-09-29: Ran a manual day cycle with one fresh blog (no Automation Course) and a newly unlocked e-book. Confirmed both funded maintenance at Quality 0, reached Quality 1 within a week of focused actions, and generated positive net cash after upkeep deductions.
