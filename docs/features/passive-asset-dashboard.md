# Passive Asset Dashboard Refresh

**Purpose**
- Present every launched asset as a workstation-style action card so upkeep, payouts, and quality goals are handled without jumping to a secondary panel.

**Key pieces**
- Category dividers (Foundation, Creative, Commerce, Tech) now act as section headers. Each header shows build counts plus launch buttons for every blueprint unlocked in that lane.
- Every active or queued instance renders as an `asset-card asset-instance-card` element with inline data: niche assignment, current quality tier, next milestone target, and a live progress bar that aggregates track requirements.
- Metric rows on each card surface latest payout, rolling daily haul averages, upkeep cost/time, and risk level so filters can act on `data-state`, `data-needs-maintenance`, and `data-risk` attributes.
- Action footer combines a primary **Maintain** button with special quality actions (Write Post, SEO Sprint, etc.) and a Details link that opens the legacy modal for deep history and selling options.

**Player benefit**
- Faster comparisons and upgrades without digging through logs.
- Clear visibility into upkeep obligations and ROI before reallocating time.

**Implementation reminders**
- Instance cards rely on the shared `asset-card__*` styling plus the new `asset-instance-card__*` utility classes for progress and action layout.
- Launch buttons reuse the existing `definition.action` wiring; keep button labels dynamic by calling `definition.action.label(state)` when available.
- Filters in `layout.js` toggle visibility via the card datasets—ensure new cards continue to set `data-state`, `data-needs-maintenance`, and `data-risk`.
