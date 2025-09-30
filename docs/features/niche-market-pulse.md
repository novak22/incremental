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

## UI Notes
- The Daily outlook card celebrates the biggest boost, fastest swing, and riskiest cooling segment with cheerful summary copy so players can triage focus quickly.
- The Momentum board is now a responsive grid of niche cards that surface score, delta, payout impact, player asset counts, earnings, and trend gain/loss in a single glance.
- Card actions jump straight to the Assets tab with matching builds spotlighted, toggle watchlist state, and hint at future "Queue recommended hustle" automation.
- Sort controls (impact, assets invested, trend movement) and filters (invested only, watchlist only) keep large rosters scannable.
- Dashboard stays focused on immediate actions while the Analytics tab houses longer-term trend storytelling for niches.
- Asset detail cards display the active niche (or a prompt to assign one) and provide a dropdown that previews the current multiplier for each option.
- Log messages celebrate switching into or out of a niche so the event feed reflects strategy changes.

## Tuning Hooks
- Popularity band labels, summaries, and multipliers live in `src/game/assets/niches.js` for quick iteration.
- CSS for the dashboard widget and niche selectors resides in `styles.css` under the dashboard and asset detail sections.
