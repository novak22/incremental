# Trends Intelligence Lab

## Overview
The Trends app graduates the classic analytics tab into a standalone browser workspace. It frames niche insights like a SaaS research dashboard: daily highlights sit in a ticker, filters surface the right niches, and each card shows global momentum, payout impact, and what the player has invested. Watchlisted niches receive their own panel and a stubbed trend history panel teases upcoming charts. All data still flows from the original analytics builders so saves and backend systems stay untouched.

## Goals
- Present the daily outlook (Top Boost, Big Swing, Cooling Risk) in a scannable header ticker.
- Offer filter buttons for payout impact, assets invested, and trend movement plus toggles for invested-only and watchlist niches.
- Recast each niche as a rich card with status badge, momentum meter, payout impact, empire stats, and quick actions.
- Maintain a dedicated watchlist surface for pinned niches with quick navigation actions.
- Keep room for future trend history charts while stubbing the panel today.

## Mapping from Classic Shell
- **Highlights** reuse the `buildNicheHighlights` output and are reformatted into ticker cards.
- **Momentum board** pulls the same entries from `buildNicheViewModel`, now rendered as grid cards with SaaS styling.
- **Filters** mirror the existing sort/checkbox logic, updating the same analytics entries on the fly.
- **Watchlist actions** still call `setNicheWatchlist`, and the “Find ventures” CTA jumps to the assets workspace via the browser layout presenter.
- **Future history** panel keeps the original analytics data warm while signalling upcoming visualizations.

## Data & Logic
- Trends relies on `buildNicheViewModel` so analytics, payouts, and watchlist counts stay synchronized with the classic shell.
- Sorting and filtering logic matches the previous implementation, prioritising trend impact, asset counts, and delta magnitude.
- Watchlist toggles immediately call `setNicheWatchlist` and locally update the cached model for responsive UI feedback until the next render tick.
- CTA buttons delegate to existing actions—`navigateToWorkspace('assets')` for venture exploration and the disabled recommended hustle stub for future automation.

## UI Notes
- Cards use bar meters, stat pills, and CTA pill buttons to mimic modern trends dashboards.
- Tone-aware metric chips colour positive/negative trend impact for instant scanning.
- Watchlist items appear in a lightweight aside with pill buttons for jump/remove actions.
- The history panel ships with an upbeat “coming soon” message so the layout already reserves space for line charts.

## Manual Test Checklist
- Launch the browser shell, open Trends from the Apps grid, and confirm the ticker lists Top Boost, Big Swing, and Cooling Risk based on current data.
- Toggle between sort filters and checkbox filters; ensure the board updates and empty states read correctly.
- Add and remove niches from the watchlist via board cards and confirm the aside updates instantly.
- Click “Find ventures for this niche” on a card and verify the browser navigates to the Assets workspace.
- Visit the watchlist panel buttons to remove a niche and to jump to ventures; both should work and re-render the board.
