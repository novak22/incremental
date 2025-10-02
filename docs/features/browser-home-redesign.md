# Browser Homepage Redesign

## Goals
- Give the browser shell a centered canvas without a sidebar so focus stays on the day-to-day widgets.
- Group homepage widgets into a consistent three-column grid that scales down gracefully on smaller screens.
- Turn the apps list into a touch-friendly launcher with icon tiles and real-time status badges sourced from service summaries.
- Give players light personalization by letting them rearrange the apps list to match their hustle priorities.

## Implementation Notes
- The launch stage now renders a single-column layout with `.browser-home__widgets` using CSS Grid to provide three equal columns on wide viewports, two columns on medium, and one column on narrow screens.
- Widget cards reuse the existing presenter modules and simply stretch to fill each grid cell. Cards share a consistent padding, border radius, and drop shadow defined in `styles/browser.css` so they feel like a matched set.
- The apps widget reuses the existing `appsWidget` module. It now renders each workspace as a tile button with an icon, label, and optional status badge derived from the service summary metadata.
- A compact "Arrange" toggle in the apps widget header activates drag-and-drop sorting. Tiles swap positions on drop and the custom order is stored in local storage so it persists between sessions.
- Navigation highlighting looks for `[data-role="browser-app-launcher"]` containers in addition to the legacy sidebar list so active pages still pulse even without the sidebar.
- The ToDo widget now aggregates quick actions, asset upgrade recommendations, and enrollable study tracks into a single scrollable list. Tasks validate hour and cash requirements before rendering so the queue always reflects moves you can take right now.
- A "Focus on" toggle lets players sort the ToDo queue for Money-first hustles, upgrade milestones, or an alternating blend of both by interleaving the two lists.
- The ToDo widget seeds its Done column with any maintenance or study time already reserved for the current day so the schedule immediately reflects auto-funded commitments.
- The browser chrome's End Day control now mirrors the ToDo widget: it fires the next queued task when work remains and flips to "Next Day" only after the list is clear.

## Player Impact
- Players can scan the day's plan, finances, and workspace launchers at a glance without juggling two columns.
- The tile launcher mirrors a mobile home screen, making it faster to spot ready actions or idle tabs from the status badges.
- Drag-sorting lets players surface their favorite workspaces in the first row so the homepage always reflects their current plan.
- Responsive breakpoints ensure the layout remains legible on narrow QA windows while keeping the three-up structure on desktop.
- Combining upgrades, hustles, and study enrollments in the ToDo queue helps players chain momentum moves back-to-back. Affordability checks keep impossible options hidden while the scroll affordance means long task lists no longer crowd out neighboring widgets.
- Focus controls surface the next best hustle, the nearest upgrade, or an alternating rhythm so players can align the day’s plan with their current goals.
- Showing pre-funded upkeep and study sessions in the Done list reassures players that the morning’s auto-scheduled time is already handled before they queue new work.
