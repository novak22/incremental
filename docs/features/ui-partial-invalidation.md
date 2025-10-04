# UI Partial Invalidation

## Goals
- Reduce unnecessary DOM churn by only updating dashboard, cards, and widgets that actually changed during a tick or action.
- Provide a shared helper that gameplay systems can use to flag dirty sections without knowing how the UI renders them.
- Keep the existing full-refresh path available so complex flows can opt-in without refactors.

## Player Impact
- Smoother interface updates during background ticks because idle sections no longer rerender every second.
- Lower chance of flicker in cards, dashboard summaries, and header controls when nothing changed.
- Faster response when chained actions trigger follow-up updates, maintaining the upbeat, responsive tone of the shell.

## Tuning Notes
- `markDirty(section)` accepts `dashboard`, `player`, `skillsWidget`, `headerAction`, and `cards`; callers can also pass arrays or maps of sections.
- `consumeDirty()` clears the pending set and should be called immediately before `updateUI` so sections are not updated twice.
- When no sections are flagged, callers should fall back to a full refresh by omitting options so late-joining systems stay accurate.
