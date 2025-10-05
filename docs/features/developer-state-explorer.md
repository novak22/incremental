# Developer State Explorer

## Goal
Provide a fast, in-browser way for engineers and designers to inspect the full game state while iterating on new systems. The explorer exposes critical progression modifiers like random event buffs, education boosts, and time bonuses without requiring manual logging or digging through storage dumps.

## Player Impact
This is a developer-only quality-of-life feature. It does not change gameplay for players, but it shortens iteration time for the team by:

- surfacing live memory values that previously required console spelunking,
- highlighting income modifiers from random events to validate blueprint tuning, and
- listing long-term buffs (education completions, upgrade perks, and time multipliers) so balancing changes are easier to verify.

## Access
Append `?view=developer` (or `?ui=developer`) to the game URL to boot directly into the explorer. The module hides the normal browser shell and displays the developer dashboard instead.

## Layout Overview
- **Overview card** – current day, cash, time remaining, active asset count, and total active events plus a timestamp for the snapshot.
- **Random event buffs** – sortable table (by modifier magnitude) showing label, percent impact, target resolution, remaining days, and tone for each active event.
- **Long-term buffs** – grouped by education completions, purchased upgrades with boost text, and current time bonuses (base, bonus, and daily additions).
- **Action memory** – rich cards for every action definition showing availability, base costs, run counters, and per-instance progress logs pulled from live state.
- **Raw state snapshot** – pretty-printed JSON dump of the full state object for quick copying into tests.

## Implementation Notes
- Registered as a UI view with guard `#developer-root`; does not interfere with normal shell boot.
- Uses `subscribeToInvalidation` to stay in sync with the simulation tick.
- Relies on registry definitions to label assets/upgrades and on `educationEffects` helpers to translate track bonuses into readable strings.
- Action explorer cards merge registry metadata with `state.actions` so devs can audit instance progress (daily logs, hours remaining, payouts) without digging through JSON.
- Styling lives in `styles/developer.css` and reuses existing font tokens while embracing a darker, data-dashboard motif.

## Follow-ups / Ideas
- Add filters to the event table for niche vs asset buffs.
- Expose hustle- or asset-level computed payout breakdowns for the most recent tick.
- Provide copy-to-clipboard buttons for JSON and per-section exports.
