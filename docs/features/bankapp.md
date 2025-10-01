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

## Implementation Notes
- `buildFinanceModel` in `src/ui/cards/model.js` synthesizes cash summaries, ledger groups, obligations, pending income, asset ROI, and study data from the existing state selectors.
- `renderFinancePage` in `src/ui/views/browser/cardsPresenter.js` assembles the new banking layout with reusable helper sections and styles, feeding the site list meta string for the BankApp tile.
- The header summary reuses the classic dashboard totals to show Current balance, Net / Day, Daily +, and Daily - so both shells stay in sync.
- `styles/browser.css` gained a `bankapp` design system (header summary strip, ledger grid, obligation cards, tables) so future browser apps can share the visual language.
- BankApp registers as a new service page in `src/ui/views/browser/config.js`, allowing the browser shell navigation and history stacks to treat it like any other site.

## Future Work
- Income/spend metrics only cover the current in-game day—there’s no historical ledger stored in state or surfaced by selectors yet. Once we add an archive, BankApp can grow a timeline module without changing today’s contracts.
