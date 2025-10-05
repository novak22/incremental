# Action Provider Registry

## Goals
- Centralize every actionable prompt (hustles, study enrollments, upgrades) so dashboard widgets and productivity tools stay in sync.
- Normalize metadata (duration, payouts, remaining runs) before it reaches UI components, ensuring consistent formatting across modules.
- Expose a metrics channel that lets providers surface queue-level context (hour budgets, labels, empty states) without duplicating logic per widget.

## Provider API
- Call `registerActionProvider(({ state, summary }) => result)` from any gameplay module that can emit player actions. The helper returns an unregister function if the provider needs to be removed later.
- Each provider should return an object with:
  - `id` – stable identifier for diffing and analytics.
  - `focusCategory` – high-level grouping (`hustle`, `upgrade`, `study`, etc.) applied to entries that don’t override it.
  - `entries` – an array passed through `normalizeActionEntries`. Supported fields include `id`, `title`, `subtitle`, `meta`, `durationHours`/`timeCost`, `durationText`, `moneyCost`, `payout`, `payoutText`, `repeatable`, `remainingRuns`, `focusCategory`, `orderIndex`, `onClick`, and optional display helpers like `buttonLabel`, `description`, or `metaClass`.
  - `metrics` – optional queue hints. Recognized keys today: `emptyMessage`, `buttonClass`, `defaultLabel`, `hoursAvailable`, `hoursAvailableLabel`, `hoursSpent`, `hoursSpentLabel`, `moneyAvailable`, and `scroller` (e.g., `{ limit: 6 }`). Missing values are auto-filled from player state (time and money totals) so providers can omit them when default behavior is acceptable.
- Providers should guard their logic and return `null`/`undefined` when no actions apply. The registry swallows errors so unstable providers don’t break the queue.
- Use `clearActionProviders()` in tests or temporary flows to snapshot the registry state and restore it after assertions.

## Dashboard & TimoDoro Integration
- The dashboard’s Quick Actions, Asset Upgrades, and Study Enrollment widgets now register providers, so every suggestion feeds the shared queue before rendering. This keeps empty messages, scrollers, and hour counters consistent across panels.
- The TODO queue handed to TimoDoro is built by `buildActionQueue`, meaning its task list, available/spent hour labels, and auto-completed upkeep entries all reference the same normalized data used on the landing dashboard.
- Future task sources (events, contracts, prestige systems) should hook into the registry rather than pushing entries directly into widgets—doing so guarantees they appear on both the home dashboard and within TimoDoro summaries without extra wiring.
