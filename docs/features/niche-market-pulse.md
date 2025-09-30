# Niche Market Pulse

## Overview
The niche system links every passive asset to an audience segment with a daily popularity roll. Assigning each build to a niche lets players chase trends for extra payout multipliers (or mitigate a slump) without rewriting asset definitions. The Analytics panel now spotlights a "Daily outlook" hero with headline highlights and a Momentum board that renders every niche as its own actionable card, blending world hype with the player’s earnings, asset count, and watchlist state at a glance.

## Goals
- Give passive assets a lightweight layer of strategic choice that refreshes each in-game day.
- Encourage players to revisit their portfolio after the nightly reset to chase positive multipliers.
- Keep the mechanic opt-in; unassigned assets continue to earn their baseline quality payouts.

## Mechanics
- **Niche definitions** live in `src/game/assets/nicheData.js`. Each niche now represents a real-world audience segment with an upbeat description plus compatible asset tags.
- **Popularity rolls** live on `state.niches.popularity`. At the end of every day (`endDay`) the game re-rolls a 25–95 score for each niche, storing yesterday’s value for delta messaging.
- **Payout multiplier**: The current score maps to a 0.75×–1.3× multiplier. `rollDailyIncome` applies the multiplier before upgrade boosts and records the contribution in the income breakdown.
- **Assignment**: Asset instances store `nicheId`. Players can pick a niche (or go unassigned) from the instance detail panel. Invalid IDs are scrubbed when state loads.
- **Recent earnings**: Asset instances now maintain a seven-day `recentIncome` history alongside their lifetime totals. The analytics widget sums that window per niche so cards can report rolling earnings instead of single-day spikes.

## UI Notes
- The Daily outlook hero highlights the biggest boost, fastest swing, riskiest cooling segment, **and** the loudest missed opportunity. Each row now calls out player exposure (asset count, seven-day earnings, and baseline comparisons) so the context is personal, not just global trend data.
- The Momentum board frames each niche card as a mini performance dashboard: the top banner spotlights the trend swing versus baseline, the middle row pairs payout multiplier with the normalized score and a future sparkline hook, and the player panel reports assets, trailing seven-day earnings, yesterday’s haul, and lifetime totals.
- Board sections collapse into "Invested" and "Not invested" buckets to keep late-game scans tidy. The default view favors invested niches, with a quick toggle for showing unassigned opportunities and a new sort for the "Largest missed opportunity" slice.
- Card actions jump straight to the Assets tab with matching builds spotlighted, offer a "Find assets" shortcut for empty niches, and continue to toggle watchlist state. A recommendation preview footer seeds the future auto-suggestion system.
- Sort controls (impact, assets invested, trend movement, largest missed opportunity) and filters (invested only, watchlist only) keep large rosters scannable.
- Dashboard stays focused on immediate actions while the Analytics tab houses longer-term trend storytelling for niches.
- Asset detail cards display the active niche (or a prompt to assign one) and provide a dropdown that previews the current multiplier for each option.
- Log messages celebrate switching into or out of a niche so the event feed reflects strategy changes.

## Tuning Hooks
- Popularity band labels, summaries, and multipliers live in `src/game/assets/niches.js` for quick iteration.
- CSS for the dashboard widget and niche selectors resides in `styles.css` under the dashboard and asset detail sections.
