# Feature Overview

This index replaces the long-form briefs. Jump straight to the active modules, and use `docs/features/playtest-scripts.md` when you need regression checklists.

## Economy & Progression Systems
- **Passive assets** – Definitions and lifecycle logic live in `src/game/assets/definitions/` and `src/game/assets/lifecycle.js`.
- **Traffic simulation** – `src/game/assets/visitsCalculator.js` mirrors the payout engine for visit projections, while `src/game/assets/visits.js` advances daily counters.
- **Hustle market** – Contract variants and rerolling logic sit in `src/game/hustles/definitions/instantHustles.js` and `src/game/hustles/market.js`.
- **Study tracks & education bonuses** – Scheduling lives in `src/game/requirements/orchestrator.js`; bonuses are defined in `src/game/educationEffects.js` and `src/game/requirements/data/knowledgeTracks.js`.
- **Assistant staffing** – Economy settings come from `src/game/data/economyConfig.js`; runtime helpers are in `src/game/assistant.js`.

## Player Session Flows
- **Session repository & switcher** – Persistence utilities are in `src/core/persistence/sessionRepository.js`, with the UI entry points in `src/ui/headerAction/sessionSwitcher.js` and `src/ui/views/browser/resolvers.js`.
- **Action registry** – Providers register through `src/game/registryBootstrap.js` and `src/game/registryService.js`, with definitions grouped under `src/game/actions/` and `src/game/content/`.
- **Offline catch-up** – Entry point at `src/game/offline.js`; the dashboard summary UI is in `src/ui/dashboard/`.

## Interface Surfaces
- **Browser workspace shell** – Layout primitives live in `src/ui/layout/`; individual workspaces live under `src/ui/*` (BlogPress, Shopily, DigiShelf, etc.).
- **Dashboard widgets** – Widget presenters are in `src/ui/dashboard/` and `src/ui/cards/`, with shared styles in `styles/widgets/`.
- **Action cards & quick actions** – Card factories are built in `src/ui/cards/` and `src/game/actions.js`; quick action helpers live in `src/ui/headerAction/`.
- **Diagnostics tooling** – Player overviews, skill inspectors, and logs live in `src/ui/player/`, `src/ui/skillsWidget/`, and `src/ui/log/`.
- **DownWork filter persistence** – Quick filter pills mirror the active save via `state.session.config.downwork`, with UI wiring in `src/ui/views/browser/apps/hustles/index.js`.

If a new feature needs a deep dive, open a short proposal in the repo or wiki and link back here.
