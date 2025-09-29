# Passive Asset Dashboard Refresh

## Summary
- TL;DR: Asset cards surface launches, upkeep, and yesterday's payouts so the best next investment pops immediately.
- Category toggles keep every launched instance reachable, even when the compact card layout is collapsed.
- Inline rosters place sell and upgrade controls side by side so upkeep pivots stay snappy.
- The briefing modal opens with a launch checklist and highlights upgrade priorities for the selected build.

## Goals
- Give players immediate insight into how every passive build performed yesterday, what it costs to maintain, and whether upkeep hours are paying off.
- Reduce the click depth for upkeep decisions by embedding sell controls and upgrade guidance into each instance row.
- Provide an upbeat "New Asset Briefing" modal so players can review setup requirements and payout expectations before committing resources, including a live checklist of setup costs, upkeep, and income ranges.
- Restore at-a-glance control of every active build via per-category asset rosters that remain available when cards are collapsed.

## Player Impact
- Faster comparisons: stat tiles on each card summarize launches, payouts, and upkeep so players can pick the next investment without cross-referencing logs.
- Smoother upgrades: inline "Support boosts" hints highlight pending equipment and study paths so players know which upgrades will unlock the next payout bump, and dedicated quick-buy buttons sit beside each instance to trigger the next one or two upgrades immediately. The dashboard card now lists a scrollable queue of upgrade nudges and calls out the percentage still needed for each quality milestone so players can celebrate progress at a glance.
- Clearer oversight: category rosters list upkeep obligations, yesterday's payout, net gain per upkeep hour, and one-click sell controls for every active instance in a familiar table format.
- Sharper next steps: the instance modal highlights current quality level, progress toward the next milestone, and direct quality actions so players can immediately invest in the build they opened, with quality upgrades now pinned to the top of the scrollable modal.
- Confident launches: the briefing modal reuses live detail renderers, ensuring setup costs, maintenance, and quality roadmaps stay accurate as modifiers shift.

## Implementation Notes
- **Cards:** Maintain category groupings with the dedicated `asset-card__*` layout, add the scrolling "Asset upgrade" recommendation card (up to eight entries with remaining percentage callouts), and preserve stat summaries when the compact view hides taglines, instances, and quality panels.
- **Inline actions:** "Builds" toggles expand the aggregated roster rendered by `assetCategoryView`, each instance row shows yesterday's payout, ROI (last income minus upkeep divided by upkeep hours), inline sell buttons, and up to two quick-buy upgrade shortcuts powered by helpers in `src/ui/assetUpgrades.js`.
- **Modal:** Active builds load through `populateAssetInfoModal`, presenting stat strips for payout, ROI, and upkeep, plus pinned quality upgrades. The briefing view swaps between legacy definitions and instance-specific overviews while keeping schema-driven setup data accurate and upgrade shortcuts aligned with inline action handlers.

## Quick Reference
| Mechanic | Confirmed? | Reminder |
| --- | --- | --- |
| Cards show launches, upkeep, and payout stats at a glance. | ☐ | Use `asset-card__*` layout with collapsible details. |
| Inline rosters expose sell + upgrade controls together. | ☐ | Ensure `assetCategoryView` renders payouts, ROI, and quick-buy buttons. |
| Blueprint modal opens with launch checklist and upgrade priorities. | ☐ | `populateAssetInfoModal` must highlight quality progress and shortcuts. |

## Open Questions
- Should the briefing modal include projected payback periods based on current quality levels?
- Would a lightweight filter for "show only assets with payouts today" help players spot underperforming builds more quickly?
