# Browser Shell View

## Goals
- Provide a browser-inspired chrome for the incremental game to explore multi-surface UI experiments.
- Keep gameplay logic intact by reusing the existing state, registry, and command pipeline.
- Establish a minimal "new tab" launch screen that spotlights today’s actionable tasks and time budget.
- Leave room for future widgets while keeping the initial experience intentionally uncluttered.

## Player Impact
- Players land on a calm launch view that feels like opening a clean browser tab—only the task list and time tracker are in view.
- The centered ToDo widget renders every available hustle as a familiar checklist row, complete with payout and duration chips.
- Hours available and hours spent stay visible so players can pace their day while they click through tasks.
- Completed actions slide into a muted "Done" ledger with time-spent markers, celebrating momentum without crowding the list.
- A dedicated End Day button sits under the checklist so players can wrap the day from the same surface they planned it on.

## Implementation Notes
- `browser.html` still boots the shared game scripts, but the homepage markup now collapses to a single ToDo widget with a time summary and End Day control.
- Dashboard presenters only initialize the todo widget; earnings and notification modules stay dormant until future iterations bring them back.
- `todoWidget` now treats each hustle row as a full-width button that fires the action, logs completions with time data, and updates hours spent immediately.
- `styles/browser.css` received a pared-down layout and new `.todo-widget` system so the launch screen reads like a standard productivity app in both light and dark themes.
- Quick action view models provide payout, duration, and day metadata so the widget can track hours and reset completion history when a new day begins.
