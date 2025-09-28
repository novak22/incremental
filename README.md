# Online Hustle Simulator

## Game Concept
Online Hustle Simulator is a browser-based incremental game about balancing limited hours with the drive to stack cash. You start each day with $45, a fixed 14-hour schedule, and a humble toolkit. From there you pick up quick gigs, juggle delayed payouts, invest in long-term assets, and use strategic upgrades to stretch the day just a little farther.

## Gameplay Loop & Systems
- **Daily Time Budget** – Every in-game day begins with 14 base hours. Taking hustles, maintaining assets, or studying upgrades consumes that time. Hiring a virtual assistant permanently adds +2 daily hours, while turbo coffee provides up to three one-hour boosts per day. Time bonuses reset when a new day starts.
- **Daily Cycle & Maintenance** – When you run out of time (or choose to end the day) the simulation advances. Asset upkeep automatically attempts to reserve the required maintenance hours; funded assets stay active and claim any daily payouts, while neglected ones pause and miss their end-of-day cash.
- **Activity Log** – Every action, payout, maintenance result, and day transition writes flavorful updates to the log so you can trace what happened during long sessions.

### Hustles
Hustles are active tasks that exchange time (and sometimes money) for short-term cash.
- **Freelance Writing** – Spend 2h to immediately earn $18. A reliable filler that keeps money flowing between bigger plays.
- **eBay Flips** – Spend 4h and $20 up front. Each flip finishes 30 seconds later for a $48 payout. Multiple flips can run concurrently, and the card displays the number of pending flips plus the timer to the next payout.

### Passive Assets
Assets are persistent ventures that pay automatically once launched. They require maintenance time each day to keep running and may offer end-of-day bonuses when properly funded.
- **Personal Blog** – Spend 3h and $25 to launch each blog instance. Every active blog earns $3 every 10 seconds (boosted to $4.50 after taking the Automation Course) and delivers a $45 daily payout if you allocate 1h of maintenance before the next day.
- **Vlog Channel** – Requires the Camera upgrade. Spend 4h and $150 to activate. Generates $9 every 15 seconds and consumes 1h of daily maintenance time to stay online.
- **Podcast Series** – Requires the Studio upgrade. Spend 5h and $220 to activate. Produces $25 every 30 seconds and needs 1.5h of upkeep each day to stay funded.

### Upgrades & Boosts
- **Hire Virtual Assistant** – Costs $180. Permanently adds +2 hours to your daily cap and immediately grants the extra time for the current day.
- **Turbo Coffee** – Costs $40 per cup, up to three per day. Each purchase adds +1 hour for the current day only.
- **Buy Camera** – Costs $200. Unlocks the Vlog Channel asset card.
- **Studio Setup** – Costs $260. Unlocks the Podcast Series asset card.
- **Automation Course** – Costs $260. Requires at least one active blog and increases all blog tick payouts by 50%.

### Persistence & Offline Progress
- **Autosave** – The game continuously saves to `localStorage` and migrates data from older save formats.
- **Offline Earnings** – Blogs, vlogs, podcasts, and eBay flips continue to accrue income while you are away. Upon returning, the game credits offline income and adds summary log entries so you can see what paid out.

## Current Feature Set
- Three-panel layout for Hustles, Passive Assets, and Upgrades with a persistent activity log and day tracker.
- Two distinct hustle archetypes (instant vs. delayed) with automated payout processing and countdown feedback.
- Three passive asset types featuring maintenance requirements, daily payouts, and income multipliers.
- Upgrade suite that mixes permanent progression, conditional content unlocks, and limited-use daily boosts.
- Automatic day rollover, maintenance allocation, and end-of-day payout distribution to reinforce the management loop.
- Persistent save/load via `localStorage` with offline catch-up and legacy save migration support.
- Flavorful log feed that narrates earnings, upkeep results, and day transitions to keep the player informed.

## Running the Project Locally
1. Clone the repository or download the source.
2. Open `index.html` in any modern browser. No build step is required—the project is a static HTML/CSS/JS bundle.
3. Optional: serve the directory with a simple HTTP server (e.g., `npx serve .`) to avoid browser restrictions on `localStorage` when testing in certain environments.

## Roadmap
- Expand the roster of hustles to cover more contract types (recurring gigs, high-risk flips, collaborative ventures).
- Introduce additional passive assets with distinct setup requirements and income curves (e.g., digital products, subscription communities).
- Add meta-progression systems such as weekly goals, reputation, or unlock trees to encourage long-term planning.
- Enrich the event system with narrative hooks, random market events, and streak bonuses that influence payouts and time costs.

## Contribution Notes
- **Coding Style** – Follow the existing vanilla JavaScript architecture: data for hustles/assets/upgrades are defined as objects inside `script.js`, paired with helper functions for state management. Prefer arrow functions, template literals, and descriptive log messages that match the current tone.
- **Adding Hustles** – Extend the `HUSTLES` array in `script.js` with new entries that include default state, action handlers, and any `update`/`process` logic for delayed payouts.
- **Adding Assets** – Append to the `ASSETS` array with definitions for setup costs, passive income logic, and state flags. Ensure `isActive`/`getIncomeAmount` helpers are provided when needed.
- **Adding Upgrades** – Add to the `UPGRADES` array, defining purchase conditions, state mutations, and optional `cardState` visuals for locked content.
- After modifying content arrays, confirm that `ensureStateShape` covers new IDs and that UI rendering updates are handled via the existing helpers. Save/load flows rely on consistent default state structures.
