# Asset Hub Overhaul

**Purpose**
- Give players an at-a-glance command center for every passive build, from launching new ventures to monitoring upkeep, payouts, and niches.

**Key pieces**
- A new "asset hub" header surfaces total builds, active counts, and upkeep totals alongside a launch grid that lists every unlocked blueprint with contextual disable reasons and success feedback.
- Launch tiles now describe setup costs, upkeep expectations, and reuse the action wiring so players can spin up assets without leaving the page.
- Each active or queued instance renders as an `asset-overview-card` with refreshed layout: niche selection with locked-in states, quality level plus progress meter, payout summary with toggleable breakdown, and compact metric grid for haul, upkeep, risk, and net per hour.
- Card footers align primary upkeep and quality buttons on the left with a persistent Details link on the right, keeping maintenance flow obvious while preserving deep-dive access.
- Category groups adopt `asset-portfolio__*` classes and expose "View category details" buttons that open the existing slide-over blueprint summaries.

**Player benefit**
- Faster comprehension of portfolio health without diving into modals.
- Immediate visibility into why launch buttons are locked, how the latest payout was composed, and whether niches still need assignment.
- Consistent action placement that highlights the next best step (maintain, run quality work, or open details).

**Implementation reminders**
- Cards must continue to set `data-state`, `data-needs-maintenance`, and `data-risk` so existing filters in `layout.js` keep functioning.
- The payout breakdown toggle relies on the existing `instance.lastIncomeBreakdown` structure; ensure new assets populate that data before enabling the button.
- Launch feedback compares pre/post instance counts—call `renderAssets(currentAssetDefinitions)` afterward so the UI refreshes immediately.
- When adding new asset types, include copy for the launch tile summary to keep the grid balanced and informative.
