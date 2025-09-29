# Asset Liquidation Flow

**Purpose**
- Give players a quick, informed way to retire passive builds when strategy shifts.

**Core behavior**
- Each card lists owned instances with last payout, upkeep, and a one-click sell button.
- Sale value defaults to `lastIncome × 3`; zero-earning builds display "No buyer yet" to signal no return.
- Selling frees the slot, pays out immediately, and logs the event in the daily snapshot under the `sale` category.

**Why it helps players**
- They can rebalance portfolios without digging through menus.
- ROI feedback (payout + upkeep) makes the sell decision feel grounded.

**Tuning levers**
- Adjust the multiplier in `calculateAssetSalePrice`.
- Update `.asset-instance-*` styles if we need stronger visual cues for rare or locked instances.
