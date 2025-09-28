# Asset Liquidation Flow

## Goals
- Provide players with a graceful exit lever for passive builds when they want to rebalance their portfolio.
- Surface a transparent resale value that tracks recent performance so the decision feels grounded, not arbitrary.
- Reduce UI friction by listing every instance directly on the asset card with contextual actions.

## Player Impact
- Each passive asset card now lists its owned instances, their current status, and the most recent payout data.
- Players can sell an instance in one click; the payout equals three times the asset’s previous day income, rewarding strong performers.
- Selling instantly frees the slot, adds the proceeds to cash, logs the event, and records the gain in the daily snapshot so the recap stays truthful.

## Tuning Parameters
- **Sale Multiplier** – Fixed at `lastIncome × 3`. Adjust inside `calculateAssetSalePrice` if economy balancing calls for different liquidation curves.
- **Disabled Sales** – Instances without earnings (no last payout) display “No buyer yet” to signal they currently scrap for zero value.
- **Metrics Category** – Sales register under the `sale` payout category for the daily ledger; summary captions include the profit inside “Active hustles” totals.
- **UI Styling** – Update the `.asset-instance-*` rules in `styles.css` to refine layout or highlight special statuses (e.g., rare blueprints).
