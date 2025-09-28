# Passive Asset Dashboard Refresh

## Summary
The passive asset workspace now presents each asset as a management card that highlights ownership counts, yesterday's earnings, income potential, upkeep, and net return per upkeep hour at a glance. Cards surface quick actions to launch new builds, open quality upgrades, and sell individual instances without digging through secondary panels. Category toggles also roll up every launched instance into a single management list so upkeep, payouts, upgrades, and liquidation stay reachable even when the compact card view is enabled. The instance briefing modal now focuses on the selected build, showcasing its quality track progress, ROI, and relevant upgrade actions.

## Goals
- Give players immediate insight into how every passive build performed yesterday, what it costs to maintain, and whether upkeep hours are paying off.
- Reduce the click depth for quality upgrades and sell actions by embedding them into each instance row.
- Provide an upbeat "New Asset Briefing" modal so players can review setup requirements and payout expectations before committing resources.
- Restore at-a-glance control of every active build via per-category asset rosters that remain available when cards are collapsed.

## Player Impact
- Faster comparisons: stat tiles on each card summarize launches, payouts, and upkeep so players can pick the next investment without cross-referencing logs.
- Smoother upgrades: an "Upgrade Quality" shortcut expands the quality panel and auto-focuses on the selected instance when triggered from the instance list.
- Clearer oversight: category rosters list upkeep obligations, yesterday's payout, net gain per upkeep hour, and one-click upgrade/sell controls for every active instance in a familiar table format.
- Sharper next steps: the instance modal highlights current quality level, progress toward the next milestone, and direct quality actions so players can immediately invest in the build they opened.
- Confident launches: the briefing modal reuses live detail renderers, ensuring setup costs, maintenance, and quality roadmaps stay accurate as modifiers shift.

## Implementation Notes
- Asset cards keep the existing category structure but use a dedicated layout (`asset-card__*` classes) for stats, actions, and instance management.
- Instance rows now expose both the previous day's payout and per-instance upgrade buttons that call `openQuality` from card extras.
- Category-level "View launched assets" toggles render aggregated tables populated by `assetCategoryView`, reusing the same upgrade and sell helpers so actions stay in sync with card state.
- The briefing modal now switches between the legacy definition view and an instance-specific overview that highlights status, upkeep, yesterday's payout, net hourly return, and quality progress/upgrade actions tailored to that build.
- ROI rows in the category roster use last income minus upkeep costs divided by upkeep hours to surface a quick dollars-per-hour snapshot for active builds.
- The modal is populated via `populateAssetInfoModal` using current detail renderers so future balance changes automatically propagate.
- Collapsed view hides the tagline, instances, and quality panel while keeping the stat summary visible for quick scanning.

## Open Questions
- Should the briefing modal include projected payback periods based on current quality levels?
- Would a lightweight filter for "show only assets with payouts today" help players spot underperforming builds more quickly?
