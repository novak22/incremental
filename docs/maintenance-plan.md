# Game Review & Maintenance Roadmap

## Snapshot of the Current Game Loop
- Players start each day with 14 base hours and $45, spending time on hustles, asset setup, and maintenance before manually ending the day.【F:src/core/state.js†L138-L166】
- Hustles cover instant payouts, delayed flips, and study tracks that unlock advanced assets by requiring consecutive day investments.【F:src/game/hustles.js†L10-L195】
- Passive assets share a multi-day setup phase, daily upkeep costs, requirement gates, and randomized income ranges, with payouts delivered only when maintenance was funded that day.【F:src/game/assets.js†L15-L383】
- Upgrades expand time capacity, unlock asset types, and provide income boosts or day-limited time injections.【F:src/game/upgrades.js†L8-L185】
- The summary panel aggregates scheduled hours, projected earnings, costs, and knowledge workload, giving players a snapshot of the upcoming day.【F:src/game/summary.js†L6-L76】

## Strengths Worth Preserving
- **Cohesive Daily Planner Fantasy** – Automatic maintenance allocation and daily recap logs make the schedule-management theme readable and deterministic.【F:src/game/assets.js†L255-L383】
- **Shared Definition Format** – Hustles, assets, and upgrades expose consistent `details`, `action`, and `cardState` hooks, simplifying UI rendering and state normalization.【F:src/ui/cards.js†L10-L121】【F:src/core/state.js†L30-L199】
- **Knowledge Track Integration** – Study hustles and requirement checks share state, allowing future progression systems to hook into the same tracking logic without bespoke plumbing.【F:src/game/requirements.js†L11-L257】

## Maintenance & Code Quality Findings
1. **Tests Fail Without Installing Dev Dependencies**  
   Running `npm test` immediately fails because `jsdom` is not installed, even though it is declared in `devDependencies`. We need an onboarding note and potentially a pretest install step or lockfile to guarantee the dependency is present.【F:package.json†L1-L10】【691d0a†L1-L117】
2. **Definition Objects Mix Data, UI Strings, and Log Copy**  
   Asset definitions interleave balance data with large message templates and UI detail functions, making tuning changes noisy and error-prone. Extracting copy and numeric tuning into separate modules (or JSON/TS config) would slim down gameplay logic and ease localization/balance passes.【F:src/game/assets.js†L15-L244】【F:src/game/assets.js†L455-L518】
3. **Setup/Maintenance Allocation Lacks Prioritisation Hooks**  
   `allocateAssetMaintenance` iterates the static asset list, consuming time in declaration order. When hours run short, later assets simply starve, preventing players from prioritising marquee builds or maintenance tiers. Introducing priority queues or player-selected ordering would reduce frustration and edge cases.【F:src/game/assets.js†L255-L315】
4. **UI Layer Holds Long-Lived DOM References**  
   Cards attach DOM nodes directly to definition objects (`definition.ui`), which survive across renders. This pattern complicates test isolation, risks stale references if definitions are reloaded, and makes server-side rendering difficult. Consider a light view-model layer or rebuilding cards with keyed rendering instead of mutating shared objects.【F:src/ui/cards.js†L10-L121】
5. **State Mutations Scatter Across Modules Without Central Actions**  
   Modules call `executeAction` but still mutate `state` ad-hoc (e.g., upgrades adjust `bonusTime`, assets toggle flags). Consolidating mutations through an action registry or state machine would simplify auditing side effects and open the door to undo/redo or analytics tooling.【F:src/game/assets.js†L411-L452】【F:src/game/upgrades.js†L8-L185】

## Game Balance Observations
- **Early Game Pace** – A day-one blog costs 3h and $25 while yielding ~$70/day with 1h upkeep, making it optimal compared to grinding freelance gigs ($18/2h). Consider lengthening setup or adding diminishing returns so contract work remains relevant.【F:src/game/assets.js†L15-L170】
- **Equipment Investment Spike** – Camera ($200) and lighting kit ($220) combine for a $420 gate before stock photos, while vlogs add $180 setup plus 1.5h upkeep. Without interim earners, the jump may feel grindy; offering mid-tier assets or partial unlocks could smooth progression.【F:src/game/upgrades.js†L43-L107】【F:src/game/assets.js†L43-L214】
- **Knowledge Track Commitment** – Automation Course demands 7 days × 3h before SaaS unlocks, on top of dropshipping and e-book prerequisites. Verify that mid-game income comfortably funds the $1500 SaaS setup and 3h upkeep, or add stepping-stone upgrades to prevent stalls.【F:src/game/assets.js†L134-L155】【F:src/game/requirements.js†L33-L39】
- **Coffee vs Assistant Value** – Coffee provides +1h at $40 up to three times daily while the assistant offers +2h permanently for $180. Because coffee has no unlock gating, players may spam it instead of pursuing assistants. Evaluate pricing or availability to keep strategic tension between short-term boosts and permanent hires.【F:src/game/upgrades.js†L8-L142】

## Roadmap Proposal
1. **Stabilise Tooling (Week 1)**
   - Document `npm install` in README and ensure the lockfile is committed so tests pass on first clone.【F:package.json†L1-L10】
   - Add CI lint/test workflow and consider lightweight linting (ESLint + prettier config) to enforce module boundaries.
2. **Refactor for Maintainability (Weeks 2-3)**
   - Split gameplay definitions into data-first modules (JSON/TS) and import copy from `docs` or localization files to reduce code churn during tuning.【F:src/game/assets.js†L15-L244】
   - Introduce an action dispatcher or reducer pattern inside `core/state.js` to channel state mutations through typed events, making save/load safer and easing debugging.【F:src/game/assets.js†L411-L452】【F:src/game/upgrades.js†L8-L185】
   - Rework card rendering to rebuild from state each frame or adopt a small templating helper so modules do not retain DOM handles.【F:src/ui/cards.js†L10-L121】
3. **Gameplay & Balance Iterations (Weeks 4-5)**
   - Prototype maintenance priority controls (e.g., drag-to-order assets or priority tags) so `allocateAssetMaintenance` respects player intent when hours are scarce.【F:src/game/assets.js†L255-L315】
   - Rebalance early assets and upgrades by introducing mid-tier gigs or scaling blog upkeep, ensuring freelance and flips remain viable past day 1.【F:src/game/assets.js†L15-L170】【F:src/game/hustles.js†L10-L74】
   - Assess equipment and knowledge pacing via telemetry once tests are stable; adjust costs/durations or add sidegrades to smooth spikes.【F:src/game/upgrades.js†L43-L185】【F:src/game/requirements.js†L11-L257】
4. **Future Systems (Post-Refactor)**
   - Layer in reputation or contract retainers that consume maintenance hours but deliver predictable income, deepening the planner fantasy without exponential idle growth.
   - Explore assistant hiring variants that trade money for time across multiple days, integrating with the upcoming state/action system for richer automation stories.

## Suggested Success Metrics
- Automated tests succeed on a clean clone with a single command (`npm install && npm test`).
- Designers can adjust asset payouts, time costs, and copy without touching core logic files.
- Players report clearer control over which assets receive scarce hours, and telemetry shows diverse hustle usage beyond the opening blog rush.
