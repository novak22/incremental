# Passive Asset Dashboard Refresh

**Purpose**
- Make passive management a one-stop view: yesterday’s payouts, upkeep status, upgrade nudges, and sell buttons all live on the cards.

**Key pieces**
- Category cards show launch counts, upkeep, and last income even when collapsed; toggles reveal instance rosters with ROI, sell, and quick-buy upgrade buttons.
- The scrolling "Asset upgrade" card surfaces up to eight nudges with percent-to-go callouts.
- Instance modals highlight current quality, next milestones, and pinned quality actions; the briefing variant reuses live setup data for confident launches.
- Active build cards now surface the current quality tier, remaining steps for the next upgrade, and a breakdown of yesterday’s payout (base roll, upgrade boosts, bonuses).

**Player benefit**
- Faster comparisons and upgrades without digging through logs.
- Clear visibility into upkeep obligations and ROI before reallocating time.

**Implementation reminders**
- Use `asset-card__*` layouts and `assetCategoryView` helpers for roster rows.
- Quick-buy buttons and upgrade hints rely on `src/ui/assetUpgrades.js`.
- Consider adding filters (e.g., "show assets with payouts today") if oversight still feels noisy.
