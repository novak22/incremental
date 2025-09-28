# Online Hustle Simulator

## Game Concept
Online Hustle Simulator is a browser-based incremental game about orchestrating your side-hustle empire one in-world day at a time. Each morning you receive a fresh stack of hours, decide how to divide them between quick gigs, study tracks, and asset upkeep, then close the day to trigger payouts. The loop rewards planning, lighthearted experimentation, and a healthy obsession with passive income spreadsheets.

## Gameplay Loop & Systems
- **Daily Time Budget** – Every in-game day begins with 14 base hours (plus permanent bonuses). Hustles, knowledge study, asset setup, and upkeep all consume this pool. Assistants can be hired (up to four) for +2 hours each, but payroll hits every morning; you can always fire them if cash or time dips too low. Turbo coffee grants up to three one-hour boosts per day.
- **Setup & Maintenance Allocation** – When a day ends, each asset checks whether you funded the required setup/maintenance hours **and** any daily cash cost. Funded instances progress (or earn income); unfunded ones pause. The next morning, the scheduler automatically earmarks required hours until you run out.
- **Knowledge Tracks** – Study hustles (e.g., Outline Mastery, E-Commerce Playbook) require a fixed number of days at specific hour costs. Completing them unlocks advanced assets and generates celebratory log entries; skipping a day after you start produces gentle warnings.
- **Daily Recap Log** – Every launch, maintenance result, payout, and study milestone is written to the log so you can reconstruct exactly what happened during busy streaks.

### Hustles & Study Tracks
- **Freelance Writing** – Spend 2h to earn $18 instantly.
- **eBay Flips** – Spend 4h and $20; complete 30 seconds later for $48 (multiple flips queue).
- **Outline Mastery Workshop** – Study 2h to mark daily progress toward e-book unlocks (3-day course).
- **Photo Catalog Curation** – Study 1.5h/day for 2 days to unlock polished stock photo galleries.
- **E-Commerce Playbook** – Study 2h/day for 5 days to prep dropshipping ventures.
- **Automation Architecture Course** – Study 3h/day for 7 days to earn SaaS-ready engineering chops.

### Passive Assets (Daily Payouts)
Each asset supports multiple instances, tracks setup progress, and rolls a daily income range once active.
- **Personal Blog Network** – Setup 1 day × 3h ($25). Requires 1h/day + $2 maintenance. Base daily income ~$70 with ±25% variance; Automation Course boosts payouts by 50%.
- **Weekly Vlog Channel** – Setup 3 days × 4h ($180) with Camera upgrade. Maintenance 1.5h/day + $5. Base daily income ~$140 with ±35% variance.
- **Digital E-Book Series** – Setup 4 days × 3h ($60) after completing Outline Mastery. Maintenance 0.5h/day. Base daily income ~$120 with ±30% variance.
- **Stock Photo Gallery** – Setup 3 days × 2h (no cost) with Camera + Lighting Kit and Photo Catalog knowledge. Maintenance 1h/day. Base daily income ~$95 with ±45% variance.
- **Dropshipping Storefront** – Setup 3 days × 4h ($500) after E-Commerce Playbook and two active blogs. Maintenance 2h/day. Base daily income ~$260 with ±50% variance.
- **SaaS Micro-App** – Setup 7 days × 5h ($1500) after Automation Architecture plus experience running a dropshipping store and e-book line. Maintenance 3h/day. Base daily income ~$620 with ±60% variance.

### Upgrades & Boosts
- **Hire Virtual Assistant** – $180 per hire, up to four assistants. Each adds +2h daily but costs $30/day in payroll; fire assistants anytime to cut wages (and hours).
- **Turbo Coffee** – $40 per cup, up to three per day, each adding +1h for the current day.
- **Buy Camera** – $200, unlocks Vlog Channels and Stock Photo Galleries.
- **Lighting Kit** – $220, unlocks Stock Photo Galleries after you buy the camera.
- **Automation Course** – $260 once you have an active blog; permanently boosts blog daily payouts by +50%.

### Persistence & Offline Behaviour
- **Autosave** – State saves every few seconds to `localStorage` (new key: `online-hustle-sim-v2`).
- **Offline Resolution** – Delayed hustles (e.g., eBay flips) settle while you are away. Assets only progress when you advance days, keeping the economy deterministic.

## Current Feature Set
- Day-driven scheduler with automatic setup/maintenance allocation and detailed end-of-day recaps.
- Six passive asset types with multi-instance tracking, setup states, maintenance funding, and dynamic daily income rolls.
- Knowledge study hustles that gate advanced assets and remember streak progress across days.
- Equipment and experience requirements surfaced directly on asset cards with live progress indicators.
- Responsive card grid with upbeat copy, income ranges, latest yield summaries, and lock styling for unmet requirements.
- Persistent save/load, offline hustle resolution, and flavourful log output to keep players oriented.

## Running the Project Locally
1. Clone the repository or download the source.
2. Open `index.html` in any modern browser. The project is a static ES-module bundle; no build tools required.
3. Optional: serve with a simple HTTP server (e.g., `npx serve .`) to avoid `localStorage` restrictions during local testing.

## Testing
1. Install dev dependencies with `npm install`.
2. Run the Node-based suite with `npm test` to exercise the day scheduler, maintenance flow, and knowledge tracks.
3. A GitHub Actions workflow runs the same command on every push and pull request targeting `main`.

## Roadmap
- Expand hustle variety (recurring retainers, seasonal gigs) to diversify daily decision making.
- Add additional passive assets (courses, subscription communities) with unique requirement chains and income rhythms.
- Introduce long-term prestige or reputation systems that leverage the new day-focused economy.
- Explore automated maintenance prioritisation tools when daily hours are over-subscribed.

## Contribution Notes
- **Code Structure** – Assets, hustles, and upgrades live in `src/game/` as ES modules; shared helpers and state management are under `src/core/`, while UI utilities live in `src/ui/`.
- **Adding Hustles** – Extend `HUSTLES` in `src/game/hustles.js`. For study-style hustles, hook into knowledge helpers from `requirements.js`.
- **Adding Assets** – Append to `ASSETS` in `src/game/assets.js`. Define setup/maintenance data, income ranges, requirement objects, and any custom log messages.
- **Adding Upgrades** – Update `UPGRADES` in `src/game/upgrades.js` and ensure new upgrade IDs are handled in requirement checks.
- After modifying content arrays, run through a manual day cycle: start builds, end the day, confirm log messaging, and verify save/load behaviour.

For design context and tuning notes, see `docs/features/day-driven-assets.md`. Recent gameplay adjustments are tracked in `docs/changelog.md`.
