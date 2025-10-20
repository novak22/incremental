# Action Progress Overhaul

## Goals
- Allow action templates to opt into deferred completion while still recording accepted progress metadata.
- Track granular, per-day effort and partial hours for long-running hustle or study actions.
- Provide helper utilities for systems that need to advance or reset progress programmatically.

## Player Impact
- Instant hustles still resolve immediately, but their underlying state now records time spent for future analytics.
- Study tracks and other deferred actions can accumulate hours across multiple days before completing.
- Future content can build on shared helpers to pause, resume, or fast-forward complex actions without duplicating logic.

## Technical Notes
- `acceptActionInstance` seeds a `progress` object with fields for `type`, `completion`, `hoursPerDay`, `daysRequired`, and `deadlineDay` when available.
- `advanceActionInstance` and `resetActionInstance` update normalized daily logs, recompute totals, and optionally trigger completion.
- State normalization now ensures persisted action instances retain consistent progress metadata across loads.
- The former barrel file `src/game/actions/progress.js` has been removed; progress helpers now live in `src/game/actions/progress/instances.js`, while template utilities remain in `src/game/actions/progress/templates.js` for direct consumption.
