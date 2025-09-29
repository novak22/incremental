# Passive Asset Dashboard Refresh

## Summary
The passive asset workspace now presents each asset as a management card that highlights ownership counts, yesterday's earnings, income potential, upkeep, and net return per upkeep hour at a glance. Cards surface quick actions to launch new builds and sell individual instances without digging through secondary panels. Category toggles also roll up every launched instance into a single management list so upkeep, payouts, supporting upgrades, and liquidation stay reachable even when the compact card view is enabled. The instance briefing modal now focuses on the selected build, showcasing its quality track progress, ROI, and relevant upgrade actions, while quick-purchase upgrade buttons and a scrollable layout keep next steps visible without crowding the screen. Active builds are grouped at the top of the slide-over with stat tiles for last payout, net per hour, upkeep, and inline upgrade shortcuts so players can tune performance instantly. The briefing now opens with a "Launch blueprint" checklist that calls out setup time, upfront costs, upkeep, and income ranges before you commit, and every launched instance lists upgrade quick actions beside the sell shortcut.

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
- Asset cards keep the existing category structure but use a dedicated layout (`asset-card__*` classes) for stats, actions, and instance management.
- Asset rows now offer a dedicated "Builds" toggle that expands the inline roster while the "Details" button focuses on the slide-over briefing.
- The dashboard now includes an "Asset upgrade" card that calls out the next quality actions for struggling builds, prioritising low-yield instances that still owe progress toward their upcoming quality tier.
- The dashboard now includes an "Asset upgrade" card that calls out the next quality actions for struggling builds, prioritising low-yield instances that still owe progress toward their upcoming quality tier. The list now scrolls to surface up to eight recommendations at once and each entry highlights the percentage remaining alongside the existing effort notes.
- Instance rows now expose both the previous day's payout and inline sell buttons so liquidation is always one click away.
- Each instance row can render up to two quick-purchase buttons for the next required equipment upgrades, deferring to existing upgrade action handlers for cost checks and logging. Quick actions now sit directly beside the sell button in the instance list so players can invest or liquidate without leaving the modal. Active builds in the slide-over now include a dedicated stat strip with payout, ROI, and upkeep details above the action row, plus inline shortcuts for pending equipment upgrades.
- Category-level "View launched assets" toggles render aggregated tables populated by `assetCategoryView`, which now highlights the first couple of supporting upgrades directly under each instance's actions. Upgrade shortcut helpers live in `src/ui/assetUpgrades.js` so both the category roster and the slide-over reuse identical button logic.
- The briefing modal now switches between the legacy definition view and an instance-specific overview that highlights status, upkeep, yesterday's payout, net hourly return, and quality progress/upgrade actions tailored to that build, with the quality upgrades section pinned above the stat summary and the content area scrollable for long descriptions. The top of the modal reuses schema-driven detail renderers to keep setup and upkeep numbers accurate even before the first launch.
- ROI rows in the category roster use last income minus upkeep costs divided by upkeep hours to surface a quick dollars-per-hour snapshot for active builds.
- The modal is populated via `populateAssetInfoModal` using current detail renderers so future balance changes automatically propagate.
- Collapsed view hides the tagline, instances, and quality panel while keeping the stat summary visible for quick scanning.

## Open Questions
- Should the briefing modal include projected payback periods based on current quality levels?
- Would a lightweight filter for "show only assets with payouts today" help players spot underperforming builds more quickly?
