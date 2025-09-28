# Passive Asset Dashboard Refresh

## Summary
The passive asset workspace now presents each asset as a management card that highlights ownership counts, yesterday's earnings, income potential, and upkeep at a glance. Cards surface quick actions to launch new builds, open quality upgrades, and sell individual instances without digging through secondary panels.

## Goals
- Give players immediate insight into how every passive build performed yesterday and what it costs to maintain.
- Reduce the click depth for quality upgrades and sell actions by embedding them into each instance row.
- Provide an upbeat "New Asset Briefing" modal so players can review setup requirements and payout expectations before committing resources.

## Player Impact
- Faster comparisons: stat tiles on each card summarize launches, payouts, and upkeep so players can pick the next investment without cross-referencing logs.
- Smoother upgrades: an "Upgrade Quality" shortcut expands the quality panel and auto-focuses on the selected instance when triggered from the instance list.
- Confident launches: the briefing modal reuses live detail renderers, ensuring setup costs, maintenance, and quality roadmaps stay accurate as modifiers shift.

## Implementation Notes
- Asset cards keep the existing category structure but use a dedicated layout (`asset-card__*` classes) for stats, actions, and instance management.
- Instance rows now expose both the previous day's payout and per-instance upgrade buttons that call `openQuality` from card extras.
- The modal is populated via `populateAssetInfoModal` using current detail renderers so future balance changes automatically propagate.
- Collapsed view hides the tagline, instances, and quality panel while keeping the stat summary visible for quick scanning.

## Open Questions
- Should the briefing modal include projected payback periods based on current quality levels?
- Would a lightweight filter for "show only assets with payouts today" help players spot underperforming builds more quickly?
