# Online Hustle Simulator

## Game Concept
Online Hustle Simulator is a browser-based incremental game about orchestrating your side-hustle empire one in-world day at a time. Each morning you receive a fresh stack of hours, decide how to divide them between quick gigs, study tracks, and asset upkeep, then close the day to trigger payouts. The loop rewards planning, lighthearted experimentation, and a healthy obsession with passive income spreadsheets.

## Gameplay Loop & Systems
- **Daily Time Budget** – Every in-game day begins with 14 base hours (plus permanent bonuses). Hustles, asset setup, upkeep, and any enrolled study tracks automatically reserve time from this pool. Assistants can be hired (up to four) for +2 hours each, but payroll hits every morning; you can always fire them if cash or time dips too low. Turbo coffee grants up to three one-hour boosts per day.
- **Setup & Maintenance Allocation** – When a day ends, each asset checks whether you funded the required setup/maintenance hours **and** any daily cash cost. Funded instances progress (or earn income); unfunded ones pause. The next morning, the scheduler automatically earmarks required hours until you run out.
- **Asset Quality Ladder** – Every passive asset launches at Quality 0 and can be upgraded by investing time (and sometimes cash) into bespoke quality actions. Quality milestones unlock higher payout ranges, steadier log messages, and whimsical celebrations when tiers are reached.
- **Knowledge Tracks** – Paying tuition enrolls you in longer-form courses that auto-schedule their daily study load until graduation. Completing them unlocks advanced assets and generates celebratory log entries; if the scheduler runs out of hours, you’ll receive gentle warnings and the course simply waits for tomorrow.
- **Daily Recap Log** – Every launch, maintenance result, payout, and study milestone is written to the log so you can reconstruct exactly what happened during busy streaks.

### Interface Overview
- **Top Bar & Snapshot** – Money, time, and day stay pinned at the top. A collapsible Daily Snapshot panel now highlights per-stat breakdowns (time invested, money earned, passive streams, cash spent, study momentum) without overwhelming the main view. Passive earnings even call out which assets (and how many instances) delivered today’s cash, so you can immediately see what worked.
- **Tabbed Workspace** – Hustles, Education, Passive Assets, and Upgrades each live in their own tab with dedicated copy and per-tab filters. Global toggles hide locked or completed cards, and you can spotlight only actionable options.
- **Categorised Collections** – Passive assets surface in Foundation, Creative, Commerce, and Advanced groupings with a collapsed-card option for rapid scanning. Each grouping now sports a "View launched assets" toggle that opens a management roster listing upkeep, yesterday’s payout, and upgrade/sell controls for every instance. Upgrades split into Equipment, Automation, Consumables, and a catch-all bucket with a quick search bar.
- **Event Log Controls** – The log dock keeps its running commentary but now includes a summary/detailed toggle when you want a lighter feed during long sessions.

### Hustles & Study Tracks
- **Freelance Writing** – Spend 2h to earn $18 instantly.
- **Audience Q&A Blast** – Spend 1h with at least one active blog to earn $12 from checklist upsells.
- **Bundle Promo Push** – Spend 2.5h once you have two active blogs plus an e-book to pocket $48 immediately.
- **eBay Flips** – Spend 4h and $20; complete 30 seconds later for $48 (multiple flips queue).
- **Outline Mastery Workshop** – Pay $140 upfront; 2h/day for 5 days auto-reserve to unlock e-book production chops.
- **Photo Catalog Curation** – Pay $95 upfront; 1.5h/day for 4 days auto-reserve to polish your stock gallery workflow.
- **E-Commerce Playbook** – Pay $260 upfront; 2.5h/day for 7 days auto-reserve to prep dropshipping ventures.
- **Automation Architecture Course** – Pay $540 upfront; 3h/day for 10 days auto-reserve to earn SaaS-ready engineering chops.

### Passive Assets (Daily Payouts)
Each asset supports multiple instances, tracks setup progress, and rolls a daily income range once active. Quality actions unique to each asset increase payouts and stability, and you can liquidate any instance directly from the card—or from the category roster—for three times its previous day payout. The asset briefing modal doubles as an instance inspector, outlining status, upkeep, yesterday’s earnings, and which upgrades are owned or still locked.
- Select quality actions now include a visible cooldown so big-impact moves (SEO sprints, ad bursts, and marketplace pitches) can only be run every few in-game days, nudging players to rotate through their portfolio.
- **Personal Blog Network** – Setup 3 days × 3h ($180). Requires 0.75h/day + $3 maintenance. Quality actions include drafting posts, SEO sprints, and backlink outreach; the first tier now delivers $3–$6/day and Quality 1 jumps to $9–$15/day with lighter post/SEO requirements so upkeep stays covered even before the Automation Course bonus pushes payouts another 50%.
- **Weekly Vlog Channel** – Setup 4 days × 4h ($420) with Camera upgrade. Maintenance 1.5h/day + $9. Record episodes, polish edits, and run promo blasts to climb from $2–$5/day at Quality 0 to $32–$40/day at Quality 3, with viral spikes possible at higher tiers.
- **Digital E-Book Series** – Setup 4 days × 3h ($260) after completing Outline Mastery. Maintenance 0.75h/day + $3. Faster chapter drafting (2.5h) and cheaper cover/review pushes mean Quality 0 now earns $3–$6/day and Quality 1 leaps to $12–$20/day so the workshop unlock hits modest profitability immediately, with late tiers capping out around $30–$42/day.
- **Stock Photo Gallery** – Setup 4 days × 2.5h ($240) with Camera + Lighting Kit and Photo Catalog knowledge. Maintenance 1h/day + $4. Shoot themed packs, keyword them, and pitch marketplaces; quality progression raises royalties from $3–$6/day to $26–$36/day.
- **Dropshipping Storefront** – Setup 5 days × 4h ($650) after E-Commerce Playbook and two active blogs. Maintenance 1.5h/day + $9. Add listings, tune pages, and run ad bursts so profits scale from $6–$10/day to $32–$40/day.
- **SaaS Micro-App** – Setup 7 days × 5h ($1600) after Automation Architecture, a Cloud Cluster upgrade, and experience running a dropshipping store and e-book line. Maintenance 2.5h/day + $12. Squash bugs, ship features, and host support sprints to grow subscriptions from $8–$14/day to $34–$42/day.

### Upgrades & Boosts
- **Hire Virtual Assistant** – $180 per hire, up to four assistants. Each adds +2h daily but costs $30/day in payroll; fire assistants anytime to cut wages (and hours).
- **Turbo Coffee** – $40 per cup, up to three per day, each adding +1h for the current day.
- **Buy Camera** – $200, unlocks Vlog Channels and Stock Photo Galleries.
- **Cinema Camera Upgrade** – $480, requires the base camera and promises richer vlog production value.
- **Lighting Kit** – $220, unlocks Stock Photo Galleries after you buy the camera.
- **Studio Expansion** – $540, requires the Lighting Kit and outfits your studio for rapid-fire shoots.
- **Server Rack - Starter** – $650, unlocks infrastructure foundations for advanced projects.
- **Cloud Cluster** – $1,150, requires the rack and unlocks SaaS deployments.
- **Edge Delivery Network** – $1,450, requires the cluster and keeps your micro-app snappy worldwide.
- **Automation Course** – $260 once you have an active blog; permanently boosts blog daily payouts by +50%.

### Persistence & Offline Behaviour
- **Autosave** – State saves every few seconds to `localStorage` (new key: `online-hustle-sim-v2`).
- **Offline Resolution** – Delayed hustles (e.g., eBay flips) settle while you are away. Assets only progress when you advance days, keeping the economy deterministic.

## Current Feature Set
- Day-driven scheduler with automatic setup/maintenance allocation and detailed end-of-day recaps.
- Six passive asset types with multi-instance tracking, setup states, maintenance funding, and dynamic daily income rolls.
- In-card asset management with instance-level breakdowns and a one-click sale option that converts yesterday’s earnings into cash at a 3× multiple.
- Daily metrics ledger that captures hours, earnings, and spending, powering the refreshed snapshot breakdowns.
- Knowledge study tracks with upfront tuition, automatic daily scheduling, and celebratory completion logs that gate advanced assets.
- Equipment and experience requirements surfaced directly on asset cards with live progress indicators.
- Responsive card grids with upbeat copy, tabbed navigation, filters, and search so players can focus on the work-in-progress that matters most.
- Persistent save/load, offline hustle resolution, and flavourful log output to keep players oriented.

## Running the Project Locally
1. Clone the repository or download the source.
2. Open `index.html` in any modern browser. The project is a static ES-module bundle; no build tools required.
3. Optional: serve with a simple HTTP server (e.g., `npx serve .`) to avoid `localStorage` restrictions during local testing.

## Testing
1. Install dev dependencies with `npm install`.
2. Run the Node-based suite with `npm test` to exercise the day scheduler, maintenance flow, and knowledge tracks.
3. A GitHub Actions workflow runs the same command on every push and pull request targeting `main`.
4. Manual spot-check: launch a blog and e-book after Outline Mastery, advance several days, and confirm Quality 0–1 payouts exceed upkeep before and after buying the Automation Course.

## Roadmap
- Expand hustle variety (recurring retainers, seasonal gigs) to diversify daily decision making.
- Add additional passive assets (courses, subscription communities) with unique requirement chains and income rhythms.
- Introduce long-term prestige or reputation systems that leverage the new day-focused economy.
- Explore automated maintenance prioritisation tools when daily hours are over-subscribed.

## Contribution Notes
- **Code Structure** – Assets, hustles, and upgrades live in `src/game/` as ES modules; shared helpers and state management are under `src/core/`, while UI utilities live in `src/ui/`.
- **Adding Hustles** – Extend `HUSTLES` in `src/game/hustles.js`. For study-style hustles, hook into knowledge helpers from `requirements.js`.
- **Adding Assets** – Add new definition modules under `src/game/assets/definitions/` and include them in the registry. Define setup/maintenance data, income ranges, requirement objects, and any custom log messages.
- **Adding Upgrades** – Update `UPGRADES` in `src/game/upgrades.js` and ensure new upgrade IDs are handled in requirement checks.
- After modifying content arrays, run through a manual day cycle: start builds, end the day, confirm log messaging, and verify save/load behaviour.

For design context and tuning notes, see `docs/features/day-driven-assets.md`. Recent gameplay adjustments are tracked in `docs/changelog.md`.
