# Maintenance Review Archive

_Short reference capturing the 2024 maintenance audit._

**Loop snapshot**
- 14 base hours and $45 start each day; players juggle hustles, multi-day passive setup, upkeep, and upgrades.
- Shared definition schema keeps UI hooks, requirements, and lifecycle logic aligned across systems.

**What’s working**
- Schedule fantasy feels cohesive thanks to automatic maintenance allocation and honest daily recaps.
- Knowledge tracks and requirements share state, simplifying future progression work.

**Key issues spotted**
1. Tests require manual dependency fixes—document installs and add CI to guarantee `npm install && npm test` just works.
2. Definition objects mix tuning data with long-form copy; separating content from logic would ease balance and localisation.
3. Maintenance allocation processes assets in declaration order, starving late entries when time is tight; we need prioritisation controls.
4. UI code stores long-lived DOM references on definitions, complicating rerenders and testing—move toward keyed render helpers.
5. State mutations scatter across modules; centralise them through an action/dispatcher layer for safer saves and analytics.

**Balance notes**
- Day-one blogs outshine freelance gigs; consider higher setup or softer payouts.
- Equipment and knowledge spikes (camera/lighting, Automation Course) may need mid-tier stepping stones.
- Coffee vs. assistant pricing should keep both options meaningful.

**Suggested roadmap**
1. Stabilise tooling (lockfile, README notes, CI).
2. Refactor definitions + state management, rebuild cards without retaining DOM references.
3. Add maintenance prioritisation and rebalance early assets/upgrades.
4. Later: explore reputation contracts and richer assistant automation once foundations land.

**Success metrics**
- Clean clone passes `npm install && npm test`.
- Designers tune payouts/copy without editing core logic.
- Telemetry shows diverse hustle usage and better control over upkeep allocation.
