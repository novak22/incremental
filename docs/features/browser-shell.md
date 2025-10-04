# Browser Shell View

## Goals
- Provide a browser-inspired chrome for the incremental game to explore multi-surface UI experiments.
- Keep gameplay logic intact by reusing the existing state, registry, and command pipeline.
- Establish a minimal "new tab" launch screen that spotlights today’s actionable tasks and time budget.
- Leave room for future widgets while keeping the initial experience intentionally uncluttered.
- Expand the shell into a multi-tab workspace so dedicated apps (starting with BankApp) can live beside the launch view.

## Player Impact
- Players land on a calm launch view that feels like opening a clean browser tab—only the task list and time tracker are in view.
- The centered ToDo widget renders every available hustle as a familiar checklist row, complete with payout and duration chips.
- Hours available and hours spent stay visible so players can pace their day while they click through tasks.
- Completed actions slide into a muted "Done" ledger with time-spent markers, celebrating momentum without crowding the list.
- A dedicated End Day button sits under the checklist so players can wrap the day from the same surface they planned it on.
- A compact bank snapshot mirrors the BankApp header so daily cashflow, net movement, and highlights are visible without opening a new tab.
- The apps widget now reads like a login roster—each workspace is a single button with its description tucked into a tooltip for quick launches.

## Implementation Notes
- `browser.html` now lays out three uniform widgets (tasks, apps, bank) so the homepage reads as a single column of quick actions.
- Dashboard presenters initialize todo, apps, and bank widgets—each module keeps state in sync with the shared registries while remaining lazy-loaded.
- `todoWidget` now treats each hustle row as a full-width button that fires the action, logs completions with time data, and updates hours spent immediately.
- Modular widget styles in `styles/widgets/` define a reusable `.browser-widget` shell plus dedicated styling for the app roster and bank chips so every panel lines up cleanly.
- Quick action view models provide payout, duration, and day metadata so the widget can track hours and reset completion history when a new day begins.
- App launchers surface a confirmation dialog before creating new resources, summarizing setup time, upfront cash, and ongoing upkeep pulled from the underlying asset definitions.

## Multi-Tab Workspace System
- A dedicated tab bar now sits beneath the chrome, rendering the launch view and each opened app as tabs with icons, titles, and close controls.
- The launch view stays anchored as the first tab; clicking it reactivates the SSO sidebar while app tabs hide the launcher and stretch their layouts to the full content width.
- Tabs persist until closed, track the most recent activation order, and restore focus to the previous workspace when one is dismissed.
- Each app lives inside the `#browser-workspaces` container so switching tabs only toggles visibility—stateful components like BankApp keep their DOM mounted between tab swaps.
- Service launchers reuse the existing registry but now call into the tab manager to either focus an already-open app or spin up a fresh tab in place.
