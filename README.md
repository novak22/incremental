# Online Hustle Simulator

## Game Concept
Online Hustle Simulator is a browser-based incremental game about balancing limited hours with the drive to stack cash. You start each day with a small nest egg and a fixed 14-hour schedule, then choose how to grind: pick up quick gigs, commit to longer contracts, or invest in passive plays that keep the money coming in while you plan your next move.

## Core Mechanics
- **Daily Time Budget** – Every in-game day grants a 14-hour baseline. Hustle actions spend time, while certain upgrades (like the virtual assistant or turbo coffee) extend the cap so you can squeeze in more work before the clock hits zero.
- **Contracts (Daily Hustles)** – Instant actions such as Freelance Writing resolve immediately with cash-on-delivery payouts. Delayed contracts like eBay Flips require upfront time (and sometimes money) but reward you later in the day.
- **Assets** – Persistent investments, currently the Personal Blog, require a one-time setup of time and money. Once active they generate automated income ticks even while you are idle or offline.
- **Upgrades & Boosts** – Purchasable perks unlock extra capabilities. Examples include hiring a virtual assistant for permanent time increases, brewing turbo coffee for limited-use time boosts, and studying an automation course to amplify blog revenue.

## Current Feature Set
- Polished UI with dedicated panels for Hustles, Passive Assets, Upgrades, and the activity Log displayed in `index.html`.
- Two fully implemented hustles: an instant freelance writing gig and delayed eBay flips that queue payouts after 30 seconds with status updates.
- Passive blogging asset with buffer-based income ticks every 10 seconds, including offline accrual handling and multiplier upgrades.
- Upgrade suite covering permanent time boosts, limited-use daily boosts, and conditional unlocks tied to asset state (e.g., automation course requires an active blog).
- Persistent save/load via `localStorage`, including migration of legacy saves and offline progress compensation.
- Event log feed with message templating for instant feedback on actions, passive income, delays, and day transitions.

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
