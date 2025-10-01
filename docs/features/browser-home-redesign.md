# Browser Homepage Redesign

## Goals
- Give the browser shell a centered canvas without a sidebar so focus stays on the day-to-day widgets.
- Group homepage widgets into a consistent three-column grid that scales down gracefully on smaller screens.
- Turn the apps list into a touch-friendly launcher with icon tiles and real-time status badges sourced from service summaries.

## Implementation Notes
- The launch stage now renders a single-column layout with `.browser-home__widgets` using CSS Grid to provide three equal columns on wide viewports, two columns on medium, and one column on narrow screens.
- Widget cards reuse the existing presenter modules and simply stretch to fill each grid cell. Cards share a consistent padding, border radius, and drop shadow defined in `styles/browser.css` so they feel like a matched set.
- The apps widget reuses the existing `appsWidget` module. It now renders each workspace as a tile button with an icon, label, and optional status badge derived from the service summary metadata.
- Navigation highlighting looks for `[data-role="browser-app-launcher"]` containers in addition to the legacy sidebar list so active pages still pulse even without the sidebar.
- The ToDo widget now merges quick actions and asset upgrade recommendations, keeping their time costs in sync with the action queue. The list sits inside a scrollable pane so every pending task stays accessible without stretching the rest of the grid.

## Player Impact
- Players can scan the day's plan, finances, and workspace launchers at a glance without juggling two columns.
- The tile launcher mirrors a mobile home screen, making it faster to spot ready actions or idle tabs from the status badges.
- Responsive breakpoints ensure the layout remains legible on narrow QA windows while keeping the three-up structure on desktop.
- Combining upgrades with quick actions in the ToDo queue helps players chain momentum moves back-to-back, and the scroll affordance means long task lists no longer crowd out neighboring widgets.
