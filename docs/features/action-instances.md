# Action Instance Tracking

## Overview
Instant hustles, study sessions, and other quick-hit tasks now share a unified "action" registry. Each action template advertises
availability limits, progress metadata, and an `instances` ledger so the game can record when work is accepted and completed.

## Goals
- Preserve daily progress from existing saves while giving new systems a dedicated state slice for action tracking.
- Surface consistent metadata (availability, expiry, progress) to the UI so dashboards and future schedulers can reason about
  every action the same way.
- Capture payouts, skill XP awards, and education bonuses on the accepted instance so history and analytics can reflect how
  each run contributed.

## Notable Details
- Action templates live in `src/game/actions/definitions.js` and currently wrap instant hustles and study sessions.
- The `actions` state slice (see `src/core/state/slices/actions/index.js`) merges legacy hustle counters and initializes a fresh
  `instances` array for every action ID.
- `createInstantHustle` now creates an accepted instance via `acceptActionInstance` before executing, and `completeActionInstance`
  stores the final payout, hours logged, and applied bonuses.
- End-of-day processing clears daily limits on the `actions` slice while leaving historical instances intact for summaries.
- Completed instances linger through the day they finish and then quietly retire the following morning so the registry keeps
  focus on actionable commitments while still surfacing fresh completions in recaps.
- The slice now preserves up to 100 in-flight or recently-finished instances per action so long-lived streaks stay visible
  without crowding out new work.
