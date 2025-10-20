# Changelog

## Unreleased
- Persistence/UI: Switching slots now autosaves the outgoing session, refreshes the header pill instantly, and ensures deleting a slot falls back to the next available save so the roster never goes blank mid-play.
- UI: Browser chrome now features an "Active session" switcher with quick create/switch/reset flows wired to the new persistence slots, including confirmations for destructive actions and automatic UI refreshes after loads.
- Persistence: Save data now lives in session-aware slots with helpers to list, create, rename, switch, and delete runs without overwriting legacy saves.
- Persistence: Legacy single-slot saves now migrate into the session index on first load, versioning the index and pruning the old `online-hustle-sim-v2` blob to prevent duplicate snapshots.
- UI: Browser home widgets now populate via a layout manager that clones page templates, mounts controllers on demand, and honors saved widget order from local storage.
- UI: Home widgets sport a "Reorder widgets" toggle with drag handles and keyboard parity so custom layouts persist across sessions.
- UI: DownWork now ships with a "Hire people" tab that surfaces assistant slots, payroll, and one-click hire/fire actions while the ShopStack catalog excludes the assistant upgrade entry point.【F:src/ui/views/browser/apps/hustles/index.js†L1-L1320】【F:styles/widgets/widgets.css†L1-L380】【F:src/ui/views/browser/components/shopstack/catalogData.js†L1-L60】
- BlogPress: Detail views now show posts published, an A–F SEO grade influenced by writing and sprint actions, and a backlink rank that tracks outreach progress toward quality milestones.
- UI: DownWork hustles now open in a tabbed planning board with a sticky capacity summary, quick filter pills, ROI hover metrics, and celebratory accept-toasts so players plan their queue instead of scrolling the old horizontal feed.【F:src/ui/views/browser/apps/hustles/index.js†L7-L860】【F:styles/widgets/widgets.css†L137-L349】
- Hustles: Doubled DownWork freelance and data entry availability, capped per-template offers at six, and introduced a $7/hour Virtual Assistant Shift so ops-minded players always have a remote contract waiting.【F:src/game/data/market/freelance.js†L4-L41】【F:src/game/data/market/dataEntry.js†L4-L41】【F:src/game/data/hustleMarketConfig.js†L1-L92】【F:src/game/data/market/virtualAssistant.js†L1-L44】【F:src/game/hustles/definitions/instantHustles.js†L1-L140】
- UI: When no hustle commitments remain, the TODO queue now surfaces a "Find freelance work" task that scouts the market and auto-accepts the best freelance contract after a quick 15-minute search.
- UI: When no hustle commitments remain, the TODO queue now surfaces a "Find work" task that scouts the whole hustle market and auto-accepts the best short commitment after a quick 15-minute search.
- Hustles: Offer expirations now include a two-day grace period so freshly rolled contracts stick around long enough to plan your schedule.
- UI: Shared action cards now power hustles, courses, and upkeep with contract descriptors, refreshed accept → work → complete copy, and expanded TODO grouping aliases for maintenance and study variants.
- UI: Hustle quick actions group market variants, surface commitment length and expiry, and card views now spotlight seat limits and market categories across Hustles and Learnly.
- UI: Timodoro’s dashboard leans into the sim vibe with a focus-block hero CTA, Daily pulse summary card, and celebratory completed-task styling so the next sprint and streak momentum stay front and center.
- UI: Timodoro queue intel now shows every runnable upgrade requirement across future quality levels and adds a mini "Do now" button to ready actions so players can trigger boosts straight from the list.
- UI: Timodoro now opens with a horizontal 08:00–24:00 timeline that dims completed tasks, highlights the current moment, and offers a "Do now" shortcut for the next actionable item right from the planner.
- Fix: Deduplicated TODO queue entries so Learnly study sessions only appear once per day, preventing accidental double logs.
- Hustles: Rebalanced multi-day contract payouts around base hourly earnings (with a 5% commitment bonus) and introduced the Data Entry Blitz gig with 4h and 8h variants for steady $5/hour work.
- Hustles: Contract templates now publish multi-variant market metadata (hours-per-day, duration windows, payout schedules, copies) so daily rolls surface retainers alongside quick gigs.【F:src/game/hustles/definitions/instantHustles.js†L19-L855】
- Tooling: `rollDailyOffers` records per-template audit summaries, exposes `getMarketRollAuditLog()`, and attaches `window.__HUSTLE_MARKET_DEBUG__` helpers for playtests.【F:src/game/hustles/market.js†L12-L755】
- Hustles: Instant gig definitions now surface offers exclusively through the market, default accepted contracts to manual progress so to-dos appear immediately, and route payouts/skill XP through shared completion hooks. Tooling can inspect the current slot via `getPrimaryOfferAction()`.
- Docs: Refreshed the economy guide, hustle market notes, and added a dedicated playtest script covering bootstrap, rerolls, and contract completion loops.【F:docs/economy.md†L80-L121】【F:docs/features/hustle-market.md†L94-L126】【F:docs/features/hustle-market-playtest.md†L1-L64】
- Economy: Completing hustle market contracts now grants their promised payouts immediately when logged hours are finished, updating money totals and payout metrics.
- Fix: Multi-day hustle contracts now honor their variant payout totals and pay the full amount once the final day is logged.
- Fix: Learnly study tasks now respect their configured daily hours so courses can't be cleared by completing a 0h log.
- Tooling: Added a Streamlit balancing workbench (`tools/balancingWorkbench/`) with live sliders, ROI charts, and PNG exports to accelerate economy tuning sessions.
- Tooling: Balancing workbench can now simulate multi-asset lineups and upgrade combos, with a handy summary of setup hours, upkeep, and bonus time.
- Governance: Gameplay PRs that adjust economy constants must update `docs/EconomySpec.md`, rerun `npm run rebuild-economy-docs`, and attach the refreshed appendix before review.
- Knowledge study tracks now spawn manual study actions; log hours yourself to advance days and earn completion rewards, with migrated saves seeding pending sessions for existing enrollments.
- Education: Course enrollment now flows through the hustle market — free tracks stay always-on while paid courses surface limited seats, with accepted offers carrying tuition and bonus metadata for dashboards.【F:src/game/hustles/knowledgeHustles.js†L1-L214】【F:src/game/requirements/orchestrator.js†L1-L227】
- Action progress now records per-day hours, supports deferred completions, and exposes helpers for advancing or resetting in-flight hustles.
- Unified instant hustles and study sessions under a shared action registry that tracks accepted instances, daily limits, and
  completion history without erasing legacy hustle progress.
- Actions: Completed instances now auto-expire after a full day and the registry keeps up to 100 recent entries per definition,
  keeping dashboards tidy without hiding fresh wins.
- Hustle market rolls daily offers from immutable templates, tracks multi-day availability, and persists timestamps for clean day rollovers.
- Hustle market offers now expose per-variant requirements and payout metadata, support simultaneous variants, and surface claimed-contract selectors via the new `acceptHustleOffer` helper.
- Hustle market variants can define `hoursPerDay`, `daysRequired`, and manual completion flags; accepted offers flow those hints into action instances so the todo queue mirrors multi-day commitments accurately.
- Hustle market now seeds offers during bootstrap, auto-rerolls at daybreak, and highlights ready vs. "coming tomorrow" listings with celebratory copy so players always see a lively exchange without manual rerolls.
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
- Tooling: Developer state explorer now includes an Action Memory panel that lists every action definition with run counters, availability metadata, and per-instance progress logs pulled from live state.
- Tooling: Developer state explorer now highlights an instance stats summary atop Action Memory, tallying total runs and per-status counts for quick debugging.
- Niche trend rerolls now guarantee every niche is always riding exactly one weighted event, including immediately after loads and daily advances.

## Recent Highlights
- Passive assets gained Quality 4–5 payout milestones with clearer upkeep cues.
- Education and hustle bonuses announce their links directly on course and task cards.
- Dashboard upgrades centralize upgrade prompts, daily stats, and schedule messaging.
