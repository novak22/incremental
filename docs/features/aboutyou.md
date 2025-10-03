# AboutYou Personal Profile

## Overview
AboutYou refreshes the browser profile hub with a first-person story that centers on what the player has already unlocked. The workspace keeps the celebratory hero, card grid, and live metrics while trimming out teasers for gear or courses the player has yet to earn.

## Goals
- Rebrand the professional profile experience to match the new AboutYou identity in navigation, copy, and visual styling.
- Keep the focus on accomplishments by filtering education and equipment lists to show only active or completed items.
- Continue reusing shared player models so the profile updates automatically alongside core progression systems.

## Player Impact
- Players land on an upbeat "AboutYou" page that frames the profile as a personal highlight reel rather than a social network.
- Education and equipment sections now spotlight owned tracks and gear, avoiding noise from locked or not-yet-purchased options.
- Career metrics, asset highlights, and hero stats still provide at-a-glance context for planning the next move.

## Data Sources & Notes
- Skills, education, and equipment data continue to flow through `buildPlayerPanelModel` with filtering applied client-side for education and equipment cards.
- Asset highlights reuse the existing asset registry models to surface the top earners.
- Daily net and lifetime totals still rely on `computeDailySummary` and aggregated state history.

## UI Considerations
- CSS class names now use the `aboutyou-` prefix to align with the new brand across hero, cards, badges, and grids.
- Education cards only render when a course is active or completed, while equipment cards skip any entries marked as locked.
- Empty-state copy encourages players to explore Learnly or Upgrades without implying that missing items should already be present.
