# Header action recommendations

## Goal
Keep players focused on the most impactful next step without digging through cards or lists by turning the header's day control into a smart recommendation.

## Player impact
- Surfaces a single "do this next" suggestion drawn from the same logic that powers the Asset upgrade and Quick actions panels.
- Prioritises longer time commitments so the button nudges players toward chunky investments before minor clean-up tasks.
- Falls back to the traditional "End Day" control whenever no qualifying action is available, preserving a clear exit.

## Mechanics
- Pull the current recommendations from the Asset upgrade panel first; if none remain, evaluate the Quick actions pool.
- Sort each candidate set by time cost (descending) to highlight the most time-intensive opportunity.
- Update the header button copy with a "Next:" prefix plus the recommended action and its time commitment.
- Clicking the button fires the recommended action immediately; only when no recommendation exists does it end the day.
