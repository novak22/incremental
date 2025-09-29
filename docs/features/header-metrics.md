# Header Pulse Metrics

## Goals
- Use the previously empty center of the shell header to surface the key daily and lifetime signals players check most often.
- Keep the daily flow (income versus upkeep) visible even when scrolling away from the dashboard cards.
- Reinforce time pressure by pairing remaining hours with the amount already spoken for each day.

## Player Impact
- Players see at a glance whether today is net-positive or cash hungry without opening the snapshot card.
- Lifetime totals call out long-term momentum, highlighting the overall net trend and total spend across days.
- Remaining versus reserved hours help players decide if they can squeeze in another hustle or need to wrap up for the day.

## Tuning Notes
- Daily earnings and spending pull directly from the existing `computeDailySummary` output.
- Lifetime totals accumulate via the `state.totals` ledger that increments alongside cost/payout metric recording.
- Reserved time is calculated from the daily time cap minus the remaining hours, with setup/maintenance portions highlighted when present.
