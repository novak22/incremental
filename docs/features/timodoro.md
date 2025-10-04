# TimoDoro Productivity Hub

## Goals
- Give browser players a dedicated productivity workspace that pulls in the existing ToDo queue, upkeep logs, and daily summary metrics without inventing new systems.
- Present a calm, two-column layout that highlights what’s finished and how much time plus payout headroom remains for the day.
- Establish a lightweight pattern for future focus tools that remix shared state into purpose-built dashboards.

## Player Impact
- Players can launch the TimoDoro app to review remaining hustle hours, today’s logged time, and earnings in one glance instead of hopping between widgets.
- The Task Log now celebrates completed hustle blocks, splitting them into Hustles, Education, Upkeep, and Upgrades so players instantly see where their hours landed.
- Maintenance and study sessions surface automatically, reminding players about assistant-driven upkeep that already consumed hours or will trigger later.

## Implementation Notes
- `src/ui/views/browser/apps/timodoro.js` composes the ToDo models (`buildQuickActionModel`, `buildAssetActionModel`, `buildStudyEnrollmentActionModel`) with the existing daily summary selectors to render grouped completions, recurring upkeep, and headline stats.
- The browser config in `src/ui/views/browser/config.js` now registers TimoDoro as a top-level service page, while `cardsPresenter.js` lists it so the workspace launcher and tab system can open it like other apps.
- Fresh layout rules in `styles/workspaces/timodoro.css` define the two-column grid, task list styling, and summary panels, borrowing the shared browser card components for consistency.

## Future Work
- Add historical filters so players can compare today’s effort with prior days and celebrate streaks.
- Pipe in assistant prompts that explain why certain upkeep tasks triggered (e.g., payroll, equipment) to deepen transparency.
- Explore lightweight inline controls for marking maintenance as delegated or rescheduling study sessions without leaving the hub.
