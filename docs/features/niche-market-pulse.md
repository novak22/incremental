# Niche Market Pulse

## Overview
The niche system links every passive asset to an audience segment with a daily popularity roll. Assigning each build to a niche lets players chase trends for extra payout multipliers (or mitigate a slump) without rewriting asset definitions. The Analytics panel now spotlights a "Daily outlook" hero with headline highlights, a refreshed "Niche pulse" list, and a "Momentum board" that groups rising and cooling segments so players can plan pivots at a glance.

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
- The Daily outlook card celebrates the hype leader, the biggest positive delta, and the shakiest segment with cheerful summary copy so players can triage focus quickly.
- Niche pulse now presents each audience in a score bar layout with shift and multiplier callouts plus optional lore snippets.
- The Momentum board splits rising and cooling niches to encourage players to double down or rebalance depending on the temperature of the market.
- Dashboard stays focused on immediate actions while the Analytics tab houses longer-term trend storytelling for niches.
- Asset detail cards display the active niche (or a prompt to assign one) and provide a dropdown that previews the current multiplier for each option.
- Log messages celebrate switching into or out of a niche so the event feed reflects strategy changes.

## Tuning Hooks
- Popularity band labels, summaries, and multipliers live in `src/game/assets/niches.js` for quick iteration.
- CSS for the dashboard widget and niche selectors resides in `styles.css` under the dashboard and asset detail sections.
