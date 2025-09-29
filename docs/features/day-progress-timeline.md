# Day Progress Timeline

**Purpose**
- Replace the old countdown with a forward-moving 24h bar so players see where the day went.

**What the player sees**
- The header starts at 08h (sleep) and fills to 24h as actions fire; colours flag maintenance, setup, hustles, study, upgrades, quality, and misc work, with assistant upkeep labelled separately.
- A legend summarises segment counts and remaining flexible hours so planning the next move doesn’t require opening the snapshot.

**Key knobs**
- `BASE_SLEEP_HOURS = 8`, `DAY_TOTAL_HOURS = 24` define the frame.
- Colours live in `styles.css` (`--time-*` variables); adjust as new categories appear.
- `MANUAL_LEGEND_LIMIT` in `src/ui/update.js` controls how many actions list individually before collapsing into “+N more”.
