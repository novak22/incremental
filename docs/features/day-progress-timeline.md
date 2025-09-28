# Day Progress Timeline

## Goals
- Replace the "time left" countdown with a forward-moving clock that reflects the full 24-hour loop players imagine for their hustles.
- Visualise where the day is going with stacked segments so routine commitments (sleep, upkeep, prep) and ad-hoc actions are easy to scan.
- Encourage planning by surfacing remaining open hours alongside the logged actions so players see room for extra wins.

## Player Impact
- The dashboard header now starts every day at 08h to represent a full night of sleep and pushes toward 24h as actions land.
- Each time investment paints a new colour-coded segment (maintenance gold, setup violet, hustles green, study pink, upgrades cyan, quality coral, misc slate) so the daily rhythm is obvious at a glance, with assistant-handled upkeep now flagged separately in the legend.
- A quick legend and caption summarise how many actions have been logged and how many flexible hours remain, helping players decide the next move without opening the full snapshot.

## Tuning Parameters
- **Segment Palette** – Adjust colours in `styles.css` (`--time-*` variables) if new categories need distinct hues.
- **Legend Density** – `MANUAL_LEGEND_LIMIT` in `src/ui/update.js` caps the number of individual actions called out before collapsing into a "+N more" summary. Raise or lower to tune readability.
- **Baseline Sleep** – `BASE_SLEEP_HOURS` (currently `8`) establishes how much of the bar is always allocated to rest before the hustle begins.
- **Day Length** – `DAY_TOTAL_HOURS` (currently `24`) controls the full span of the bar and the "X / 24h" readout. Update if the simulation ever models alternate schedules.
