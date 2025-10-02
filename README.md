# Online Hustle Simulator

## Game Concept
Online Hustle Simulator is a browser-based incremental game about orchestrating your side-hustle empire one in-world day at a time. Each morning you receive a fresh stack of hours, decide how to divide them between quick gigs, study tracks, and asset upkeep, then close the day to trigger payouts. The loop rewards planning, lighthearted experimentation, and a healthy obsession with passive income spreadsheets.

## Gameplay Loop & Systems
- **Daily Time Budget** – Every in-game day begins with 14 base hours (plus permanent bonuses). Hustles, asset setup, upkeep, and any enrolled study tracks automatically reserve time from this pool. Assistants can be hired (up to four) for +2 hours each, but payroll hits every morning; you can always fire them if cash or time dips too low. Turbo coffee grants up to three one-hour boosts per day.
- **Setup & Maintenance Allocation** – When a day ends, each asset checks whether you funded the required setup/maintenance hours **and** any daily cash cost. Funded instances progress (or earn income); unfunded ones pause. The next morning, the scheduler automatically earmarks required hours until you run out.
- **Asset Quality Ladder** – Every passive asset launches at Quality 0 and can be upgraded by investing time (and sometimes cash) into bespoke quality actions. Quality milestones unlock higher payout ranges, steadier log messages, and whimsical celebrations when tiers are reached.
- **Audience Niches & Trends** – Each passive asset can target a whimsical niche that re-rolls in popularity every day. Assign builds to hot audiences for up to +30% payouts (or unassign to ride out a slump) and monitor the daily popularity board from the dashboard.
- **Skills & Experience** – Hustles, asset launches, quality pushes, upgrades, and study milestones award skill XP across ten creative disciplines. Skill tiers (Novice → Master) grant celebratory log entries, while total skill XP feeds an overall creator level that tracks your long-term momentum.
- **Knowledge Tracks** – Paying tuition enrolls you in longer-form courses that auto-schedule their daily study load until graduation. Completed courses unlock advanced assets, inject gig-specific payout boosts, and now apply passive-income modifiers to matching assets; if the scheduler runs out of hours, you’ll receive gentle warnings and the course simply waits for tomorrow.
- **Daily Recap Log** – Every launch, maintenance result, payout, and study milestone is written to the log so you can reconstruct exactly what happened during busy streaks.

### Interface Overview
- **Top Bar & Snapshot** – Money, time, and day stay pinned at the top. A collapsible Daily Snapshot panel now highlights per-stat breakdowns (time invested, money earned, passive streams, cash spent, study momentum) without overwhelming the main view. Passive earnings even call out which assets (and how many instances) delivered today’s cash, so you can immediately see what worked.
- **Browser Tabs** – The browser shell keeps the launch view pinned as the first tab while apps like BankApp open in their own closable tabs so you can bounce between workspaces without losing state.
- **BankApp** – The browser shell’s SSO grid now includes a dedicated BankApp tile that opens a finance dashboard with current balance, Net / Day, Daily +, Daily -, and the classic ledger presented in a bank-flavored layout.
- **BlogPress** – A faux CMS that lists every Personal Blog in a table, opens detail panels with payout recaps and niche controls, and offers a pricing page explaining setup costs, upkeep, quality ladders, and blog-specific upgrades—all powered by the original blog economy.
- **ShopStack** – A dedicated storefront app that pulls the entire upgrade catalog into category chips and card tiles. Players can search by name, filter by lane, open e-commerce style detail pages with requirement checklists, and review a My Purchases tab that highlights upkeep and purchase dates—all while the original upgrade backend handles costs and effects.
- **Event Log Controls** – The log dock keeps its running commentary but now includes a summary/detailed toggle when you want a lighter feed during long sessions.

### Hustles & Study Tracks
- **Freelance Writing** – Spend 2h to earn $18 instantly (Outline Mastery grads earn +25%).
- **Audience Q&A Blast** – Spend 1h with at least one active blog to earn $12 from checklist upsells (+$4 after Brand Voice Lab). Limited to one spotlight stream per day, so pick your prime time.
- **Bundle Promo Push** – Spend 2.5h once you have two active blogs plus an e-book to pocket $48 immediately (+$6 after E-Commerce Playbook).
- **Micro Survey Dash** – Fire off 15-minute surveys for $1 a pop (up to four per day; Guerrilla Buzz Workshop adds +$1.50 each) to keep pockets of time profitable.
- **Outline Mastery Workshop** – Pay $140 upfront; 2h/day for 5 days auto-reserve to unlock e-book production chops and boost writing/narration gigs.
- **Photo Catalog Curation** – Pay $95 upfront; 1.5h/day for 4 days auto-reserve to polish your stock gallery workflow and increase Event Photo Gig payouts by 20%.
- **E-Commerce Playbook** – Pay $260 upfront; 2h/day for 7 days auto-reserve to prep dropshipping ventures (+$6 Bundle Promo Push, +20% Dropship Pack Party).
- **Automation Architecture Course** – Pay $540 upfront; ~2¼h/day for 10 days auto-reserve to earn SaaS-ready engineering chops (+$12 SaaS Bug Squash).
- **Brand Voice Lab** – Pay $120 upfront; 1h/day for 4 days to sharpen livestream charisma and unlock +$4 tips on Audience Q&A gigs.
- **Guerrilla Buzz Workshop** – Pay $180 upfront; 1.5h/day for 6 days to field-test street marketing hooks (+25% Street Team Promo, +$1.50 Micro Survey Dash).
- **Curriculum Design Studio** – Pay $280 upfront; 2.5h/day for 6 days to co-design breakout lessons (+30% Pop-Up Workshop payouts, +15% Bundle Promo Push upsells).
- **Post-Production Pipeline Lab** – Pay $360 upfront; 3h/day for 8 days to refine finishing workflows (+35% Vlog Edit Rush payouts and +18% Weekly Vlog Channel passive income).
- **Fulfillment Ops Masterclass** – Pay $320 upfront; 2h/day for 7 days shadowing logistics leads (+25% Dropship Pack Party earnings and +35% Dropshipping Product Lab daily revenue).
- **Customer Retention Clinic** – Pay $210 upfront; 2h/day for 5 days to coach support teams (+$8 SaaS Bug Squash retainers and +25% SaaS Micro-App subscriptions).
- **Narration Performance Workshop** – Pay $190 upfront; 1.75h/day for 4 days with vocal coaches (+30% Audiobook Narration payouts and +15% e-book royalties).
- **Gallery Licensing Summit** – Pay $240 upfront; 2.25h/day for 5 days to pitch curators (+30% Event Photo Gig bookings and +22% Stock Photo Gallery passive income).
- **Syndication Residency** – Pay $300 upfront; 2h/day for 6 days cultivating partnerships (+20% Freelance Writing payouts, +$2 Street Promo Sprint stipends, and +18% Personal Blog Network income).

### Passive Ventures (Daily Payouts)
Each asset supports multiple instances, tracks setup progress, and rolls a daily income range once active. Quality actions unique to each asset increase payouts and stability, and you can liquidate any instance directly from the card—or from the category roster—for yesterday’s payout ×3 × (Quality level + 1). The asset briefing modal doubles as an instance inspector, outlining status, upkeep, yesterday’s earnings, and which upgrades are owned or still locked.
- Select quality actions now include a visible cooldown so big-impact moves (SEO sprints, ad bursts, and marketplace pitches) can only be run every few in-game days, nudging players to rotate through their portfolio.

- **Personal Blog Network** – Setup 3 days × 3h ($180). Requires 0.75h/day + $3 maintenance. Quality actions include drafting posts, SEO sprints, and backlink outreach; the ladder now climbs from $3–$6/day at Quality 0 to $64–$84/day at Quality 5 once backlinks, SEO, and outreach hum in unison (Automation Course still boosts payouts another 50%, and Syndication Residency alumni layer an additional +18% daily revenue).
- **Weekly Vlog Channel** – Setup 4 days × 4h ($420) with Camera upgrade. Maintenance 1.5h/day + $9. Record episodes, polish edits, and run promo blasts to climb from $2–$5/day at Quality 0 to $62–$82/day at Quality 5, with viral spikes getting juicier at the new top tiers; Post-Production Pipeline Lab grads add +18% to every passive payout.
- **Digital E-Book Series** – Setup 4 days × 3h ($260) after completing Outline Mastery. Maintenance 0.75h/day + $3. Faster chapter drafting (2.5h) and cheaper cover/review pushes mean Quality 0 still earns $3–$6/day while the series can now crescendo to $60–$78/day at Quality 5, and Narration Performance Workshop alumni tack on +15% royalties.
- **Stock Photo Gallery** – Setup 5 days × 4h ($560) with Camera + Studio Expansion upgrades and Photo Catalog knowledge. Maintenance 1.2h/day + $10. Shoot themed packs, keyword them, and pitch marketplaces; sustained quality pushes now raise royalties from $3–$6/day at launch to $112–$150/day at Quality 5, with White-Label Alliance partners layering extra income and marketing progress while Gallery Licensing Summit graduates sprinkle an extra +22% royalty boost.
- **Dropshipping Storefront** – Setup 6 days × 4h ($720) after E-Commerce Playbook and two active blogs. Maintenance 1.5h/day + $12. Add listings, tune pages, and run ad bursts so profits scale from $6–$10/day to $130–$176/day once the omnichannel engine is humming at Quality 5; the new commerce ladder stacks payout multipliers and +1 progress to every quality action tier you unlock, and Fulfillment Ops Masterclass graduates apply a +35% passive income multiplier.
- **SaaS Micro-App** – Setup 8 days × 4h ($960) after Automation Architecture, the Server Rack → Cloud Cluster → Edge Delivery ladder, and experience running a dropshipping store plus e-book line. Maintenance 2.2h/day + $24. Squash bugs, ship features, and host support sprints to grow subscriptions from $4–$8/day to $168–$220/day after unlocking the Ecosystem Powerhouse tier at Quality 5, with Customer Retention Clinic alumni layering an additional +25% subscription revenue.

### Upgrades & Boosts
- **Hire Virtual Assistant** – $180 per hire, up to four assistants. Each adds +3h daily but costs $24/day in payroll; fire assistants anytime to cut wages (and hours).
- **Turbo Coffee** – $40 per cup, up to three per day, each adding +1h for the current day.
- **Camera** – $200, unlocks Vlog Channels and Stock Photo Galleries.
- **Cinema Camera Upgrade** – $480, requires the base camera; trims setup/maintenance time, adds ~25% vlog payouts, and doubles quality progress for video/photo actions.
- **Lighting Kit** – $220, unlocks Stock Photo Galleries after you buy the camera.
- **Studio Expansion** – $540, requires the Lighting Kit; adds ~15% payouts to galleries, doubles related quality progress, and speeds photo/video setup work.
- **Editorial Pipeline Suite** – $360, requires the Automation Course, an active blog, and Outline Mastery; grants ~20% more blog/e-book payouts, 1.5× quality progress for writing content, and snappier setup windows.
- **Syndication Suite** – $720, requires Editorial Pipeline, an active blog and e-book, and Brand Voice Lab; adds ~25% payouts across blogs, e-books, and vlogs while multiplying creative quality progress by roughly 1.33×.
- **Immersive Story Worlds** – $1,080, requires Syndication Suite alongside active blog/e-book/vlog combos and both knowledge tracks; adds ~12% extra payouts and doubles quality progress for every creative asset you target.
- **Server Rack - Starter** – $650, unlocks infrastructure foundations for advanced projects and shaves ~5% off tech setup time.
- **Fulfillment Automation Suite** – $780, requires two active dropshipping shops plus the E-Commerce Playbook; injects ~25% higher dropshipping payouts and doubles research/listing/ad quality progress.
- **Cloud Cluster** – $1,150, requires the rack, unlocks SaaS deployments, and lifts micro-app payouts by ~20% while boosting feature/stability progress by 1.5×.
- **Global Supply Mesh** – $1,150, requires the automation suite, three active shops, and Photo Catalog Curation; adds ~30% dropshipping income, 1.5× quality progress, and faster setup sprints for commerce actions.
- **Edge Delivery Network** – $1,450, requires the cluster; multiplies SaaS payouts by ~35%, trims maintenance drag by ~15%, and doubles feature/stability/marketing progress.
- **White-Label Alliance** – $1,500, requires the global mesh, four active shops, and both commerce/photo studies; layers ~35% more income across dropshipping and stock photos while adding a 1.33× quality progress multiplier for their actions.
- **Automation Course** – $260 once you have an active blog; permanently boosts blog daily payouts by +50% and doubles post-quality progress.

### Persistence & Offline Behaviour
- **Autosave** – State saves every few seconds to `localStorage` (new key: `online-hustle-sim-v2`).
- **Offline Reminder** – The clock pauses while you are away; advance in-game days to keep assets earning.

## Current Feature Set
- Day-driven scheduler with automatic setup/maintenance allocation and detailed end-of-day recaps.
- Six passive asset types with multi-instance tracking, setup states, maintenance funding, and dynamic daily income rolls.
- In-card asset management with instance-level breakdowns and a one-click sale option that converts yesterday’s earnings into cash at a 3× (Quality level + 1) multiple.
- Daily metrics ledger that captures hours, earnings, and spending, powering the refreshed snapshot breakdowns.
- Knowledge study tracks with upfront tuition, automatic daily scheduling, and celebratory completion logs that gate advanced assets.
- Equipment and experience requirements surfaced directly on asset cards with live progress indicators.
- Responsive card grids with upbeat copy, tabbed navigation, filters, and search so players can focus on the work-in-progress that matters most.
- Persistent save/load and flavourful log output to keep players oriented.

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
- **Adding Hustles** – Drop new instant gig configs into `src/game/hustles/definitions/` (they should export plain objects consum
  ed by `createInstantHustle`). Study programs live in `src/game/hustles/knowledgeHustles.js` so education flows evolve on their
  own cadence.
- **Adding Assets** – Add new definition modules under `src/game/assets/definitions/` and include them in the registry. Define setup/maintenance data, income ranges, requirement objects, and any custom log messages.
- **Adding Upgrades** – Update `UPGRADES` in `src/game/upgrades.js` and ensure new upgrade IDs are handled in requirement checks.
- After modifying content arrays, run through a manual day cycle: start builds, end the day, confirm log messaging, and verify save/load behaviour.

For design context and tuning notes, see `docs/features/day-driven-assets.md`. Recent gameplay adjustments are tracked in `docs/changelog.md`.
