# DownWork Home Widget

## Goals
- Give players a one-click way to review and accept ready freelance gigs without opening the full DownWork workspace.
- Highlight actionable contracts that align with the player's unlocked tracks and remaining focus hours.
- Provide lightweight sorting so players can compare hourly rate, total payout, or time commitment at a glance.

## Player Impact
- The homepage now surfaces a "DownWork Gigs" widget featuring only offers that can be accepted immediately. Locked templates or commitments that exceed the player's remaining time are hidden to reduce noise.
- Each listing spotlights time, payout, and hourly rate, and the Accept button routes through the existing hustle acceptance flow so bank totals, TODO entries, and commitments stay in sync.
- Players can toggle between Per hour, Total money, and Work time sort modes, making it easier to prioritise fast wins, high payouts, or short commitments depending on the day's plan.

## Tuning Notes
- Offers are fetched via the shared hustle market helpers (`getAvailableOffers`, `describeHustleOfferMeta`) to ensure the widget mirrors the main DownWork app.
- Filtering uses the same requirement checks as the Find Work action. If an offer lacks the required unlocks or demands more hours than are currently available, it is omitted until conditions are met.
- Empty states adapt copy based on remaining hours, gently nudging players to clear time or wait for the next market roll when no gigs qualify.
