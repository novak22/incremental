# UI Redesign Notes

## Overview
Mission Control has been rebuilt into a three-column experience: the Command Deck keeps core meters and marching orders within reach, the Mission Rail gathers navigation and shortcuts, and the Focus Stage in the centre gives each gameplay pillar generous breathing room. Everything noisy now lives inside collapsible drawers so new players see guidance first and summon depth only when they ask for it.

## Goals
- Keep the top-level day summary visible while moving secondary detail into drawers and popouts.
- Provide obvious shortcuts for common flows (queue hustles, resume studies, browse upgrades) without duplicating entire panels.
- Reduce cross-page scrolling by grouping navigation, filters, and planners into dedicated rails.
- Preserve all existing mechanics and breakdowns so returning players still recognise their data.

## Key Elements
- **Command Deck** – Sticky three-column header with Money/Day stats, a dedicated timeline hub, and a "Today’s brief" drawer of quick-call buttons.
- **Mission Rails** – Left rail wraps navigation, the daily snapshot, and strategy shortcuts inside `<details>` drawers; the right rail hosts the live event log plus planner prompts for upgrades and studies.
- **Global Control Drawer** – Filters now sit inside a collapsible workspace drawer with reminder copy about how they affect the board.
- **Shortcut Buttons** – Context-aware quick actions focus search inputs, open drawers, and smooth-scroll to their sections so players can move instantly.
- **Preserved Pillars** – Hustles, Education, Assets, and Upgrades keep their grids, filters, and modal flows but inherit the new breathing room and scroll offsets.

## Future Considerations
- Animate drawer openings to reinforce the sense of panels sliding into view.
- Persist drawer open states so veteran players can pin their favourite layout between sessions.
- Introduce contextual callouts inside the Command Deck when time or cash dips below thresholds.
