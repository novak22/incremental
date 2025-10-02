# BankApp Balance Center

## Goals
- Introduce a dedicated finance hub that mirrors modern digital banking dashboards while reusing the game’s existing economy data.
- Surface real-time cashflow, obligations, and opportunity costs so players can plan reinvestments without leaving the browser shell.
- Establish a template for future external “apps” that can live inside the browser view alongside the homepage and service launchers.

## Player Impact
- Players can open BankApp from the homepage SSO list to review cash on hand, today’s net flow, and lifetime earnings at a glance.
- The daily ledger groups inflows and outflows by stream, highlighting which hustles or passive assets delivered the biggest returns.
- Obligations cards call out unfunded upkeep, assistant payroll, and active tuition so players can prioritize funding before ending the day.
- Pending payouts, per-asset performance, and curated opportunity lists make it easier to decide whether to launch, upgrade, or study next.
- A seven-day cashflow timeline and the shared activity log now surface historical context so players can spot streaks and relive clutch moments without leaving the app.

## Implementation Notes
- `buildFinanceModel` in `src/ui/cards/model/finance.js` synthesizes cash summaries, ledger groups, obligations, pending income, asset ROI, study data, the rolling history archive, and recent log entries from the existing state selectors.
- `renderFinancePage` in `src/ui/views/browser/cardsPresenter.js` assembles the new banking layout with reusable helper sections and styles, feeding the site list meta string for the BankApp tile.
- The header summary reuses the classic dashboard totals to show Current balance, Net / Day, Daily +, and Daily - so both shells stay in sync.
- `styles/browser.css` gained a `bankapp` design system (header summary strip, ledger grid, obligation cards, tables) so future browser apps can share the visual language.
- BankApp registers as a new service page in `src/ui/views/browser/config.js`, allowing the browser shell navigation and history stacks to treat it like any other site.
- Daily metrics now archive the last seven wrap-ups in state so the browser widget and BankApp page can render rolling trends without extra backend calls.

## Future Work
- Consider extending the seven-day archive once storage budgets allow, and explore inline breakdowns for deeper per-day drilldowns without overwhelming the timeline.
