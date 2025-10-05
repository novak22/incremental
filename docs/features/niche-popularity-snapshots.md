# Niche Popularity Snapshots

## Overview
Niche popularity now mirrors the current roster of active trend events instead of rolling random values at the start of each day. The synchronizer composes every niche's multiplier from ongoing events and stores the results as a snapshot (`score`, `delta`, `multiplier`, `label`, `tone`, `summary`). When no events apply, niches fall back to a neutral, steady baseline so dashboards and analytics remain grounded.

## Goals
- Keep niche popularity aligned with trend events so payouts and UI copy match the live modifiers.
- Persist multi-day events across reloads without rerolling random scores that desync the UI and analytics history.
- Provide sanitized snapshots that can be surfaced in tooltips, watchlists, and archived analytics without ad-hoc formatting per call site.

## Implementation Notes
- `syncNicheTrendSnapshots(state)` aggregates `currentPercent` modifiers from `getNicheEvents(state, nicheId)` and caches the derived snapshot for each niche.
- Popularity initialization paths (`ensureNicheState`, persistence load/save hooks, and the day-end lifecycle) now call the synchronizer so state stays deterministic.
- Snapshots clamp and round derived values through `src/game/niches/popularitySnapshot.js` to avoid runaway numbers while keeping deltas for comparison charts.
- Niche trend blueprints roll 5–10 day schedules that ramp: upbeat waves open around +10% before climbing toward +35–55% boosts, while fatigue dips start near -12% and steepen toward -35–-60% hits before easing.
