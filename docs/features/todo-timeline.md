# ToDo Timeline & Daily Flow

## Goals
- Give players a horizontal timeline showing completed, current, and upcoming tasks from 08:00 to midnight.
- Keep styling aligned with the browser shell while spotlighting distinct task types (contracts, upgrades, study, upkeep).
- Surface a "Do now" shortcut for the next runnable task without disrupting the existing queue interactions.

## Player Impact
- Completed work now appears to the left of the glowing time marker, gently dimmed so the day’s wins stay visible without stealing focus.
- Future actions inherit their queue ordering and durations, letting players reason about how upgrades or study blocks fit into the remaining evening.
- The always-on "Do now" micro-CTA mirrors the queue’s next entry so action-oriented players can trigger momentum directly from the schedule view.

## Implementation Notes
- `todoTimeline.js` converts the todo widget model into timeline segments, clamps durations into a 08:00–24:00 window, and tags each block with category metadata for styling.
- `todoDom.renderTimeline` mounts the rendered track above the existing queue, reusing the widget controller lifecycle to keep intervals and DOM nodes tidy.
- Task type styles follow the home widget language: contracts reuse the accent fill, upgrades use a striped gradient, study slots have dotted borders, and upkeep renders as a lighter background bar.
- The current-time indicator refreshes every minute with a lightweight ticker stored in a `WeakMap`, preventing orphaned intervals when the widget rerenders or unmounts.

## Future Hooks
- Placeholder hooks (`todo-timeline__hook--recurring`, `--drag`, `--bulk`) live inside the track for upcoming recurring markers, drag handles, or bulk planning overlays without reshaping the DOM later.
- The data model keeps raw entries untouched; future work can pipe in simulated time-of-day values or multi-day splits without replacing the renderer.
