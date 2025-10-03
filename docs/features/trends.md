# Trends Intelligence Lab

## Overview
The Trends app now frames niche analytics like a professional SaaS dashboard. A focused header introduces search, sorting, and an All vs. Watchlist toggle; a market overview strip surfaces the strongest swings and payouts; and a clean card grid highlights per-niche momentum with sparklines, deltas, and payout multipliers. Watchlisted niches receive a richer panel with payout context while empire totals stay as muted footnotes. All data continues to flow from the shared analytics builders so saves and backend systems remain untouched.

## Goals
- Provide a compact header with "Trends Analytics" branding, tagline, search, sort dropdown, and All/Watchlist toggle.
- Summarise the day with overview cards for Top Boost, Biggest Drop, Best Payout Multiplier, and Active Niches Count.
- Render a responsive three-column trend grid with sparklines, momentum delta, payout multipliers, and a watchlist star per card.
- Keep empire context light via a muted footer that rolls up ventures and earnings for the current selection.
- Give pinned niches a dedicated watchlist panel with average payout and momentum trend callouts for fast scanning.
- Persist a rolling seven-day recap of niche highlights and surface it beside the daily analytics for quick comparisons.

## Mapping from Classic Shell
- **Overview metrics** draw from `buildNicheHighlights` and the board entries to surface top boosts, drops, and multiplier leaders.
- **Trend grid** still reads entries from `buildNicheViewModel`, applying new search, sort, and view filters on the client.
- **Watchlist controls** continue to call `setNicheWatchlist`, updating the cached entries so the UI stays responsive between state ticks.
- **Empire summary** reuses existing earnings and asset counts, now rolled into the grid footer instead of heavy per-card sections.
- Navigation URLs remain unchanged, keeping `/`, `/watchlist`, and `/niche/{slug}` ready for future expansion.

## Data & Logic
- Sorting options map to highest momentum score, highest payout impact, or fastest cooling delta using the existing board metrics.
- Search operates on niche names only, ensuring no new backend lookups are required.
- Sparkline trendlines interpolate between the stored previous and current scores when deeper history is unavailable, keeping fidelity with current data.
- Watchlist meta counts recalculate locally so filters disable gracefully when nothing is starred.
- Each day’s highlights and per-niche analytics snapshot are archived client-side via `archiveNicheAnalytics`, trimming the history array to the newest seven entries.

## UI Notes
- Cards lean on whitespace, small caps labels, and subtle shadows to mimic modern analytics SaaS styling.
- Watchlist stars use a single tap target in the card header and echo the state in both grid and watchlist panels.
- Overview cards adopt emoji icons for quick scanning while maintaining a compact vertical rhythm.
- Footer messaging keeps the "updated daily" reminder subtle so future history modules can slot underneath.
- The 7-day recap card lists each day’s Top boost, Big swing, and Cooling risk summaries with timestamps so players can spot streaks at a glance.

## Manual Test Checklist
- Launch the browser shell, open Trends from the Apps grid, and confirm the header shows search, sort, and All/Watchlist toggle controls.
- Verify the overview strip lists Top Boost, Biggest Drop, Best Payout Multiplier, and Active Niches Count populated from current data.
- Toggle between sort options and enter a search term; the grid should update in-place and refresh the "Your empire" footer summary.
- Star and unstar a niche from the grid; confirm both the grid badge and the watchlist panel update immediately.
- Switch to the Watchlist view toggle and ensure only starred niches appear in the main grid with empty states when appropriate.
- End a few days in succession and confirm the 7-day recap card logs the newest highlight summaries while trimming older ones beyond the seven-day window.
