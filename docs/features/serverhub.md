# ServerHub Platform

## Goal
ServerHub graduates the Micro SaaS venture flow from the legacy dashboard into a cloud control center that mirrors modern hosting portals. Players can launch apps, monitor uptime, inspect payout modifiers, and queue quality actions without leaving the browser shell.

## Player Impact
- **Single Launch Surface** – The Deploy New App CTA reuses the existing SaaS asset action, so all setup costs, time, and requirements stay in sync with the backend economy.
- **Live Health Metrics** – The hero strip surfaces total active apps, yesterday’s revenue, upkeep, and net daily flow so players immediately see whether their SaaS portfolio is profitable.
- **Detailed Operations Console** – The My Apps table lists every active instance with niche, payout, upkeep, and ROI data. Selecting an app opens a sidebar with payout breakdowns, quality progress, uptime context, and one-click quality actions that mirror the classic controls.
- **Upgrade Alignment** – The Upgrades view highlights the existing infrastructure ladder (Server Rack → Cloud Cluster → Edge Delivery Network) with purchase states pulled from the shared upgrade system. Triggering a button fires the same upgrade logic and ToDo tasks as the original UI.
- **Pricing Guidance** – The Pricing view converts the SaaS quality tiers into tiered plans so players can compare setup cost, upkeep, and projected payout ranges before investing.

## Implementation Notes
- Pulls live data from `buildServerHubModel`, which wraps the existing `saas` asset definition and upgrade catalogue.
- Niche selection uses the same `assignInstanceToNiche` helper as other asset apps; instances lock their niche after the first choice.
- Quick actions call `performQualityAction('saas', …)` so todo items, time costs, and payout modifiers continue to flow through the shared systems.
- Metrics, tables, and breakdowns render within ServerHub-specific components and styling to mimic SaaS dashboards while respecting the repository’s browser theme variables.

## Tuning Hooks
- KPI copy, layout spacing, and plan descriptions live in `serverhub.js` files (model + component) so future balance passes can adjust copy without touching CSS.
- Pricing plan summaries derive directly from quality level income ranges; adjust those ranges in the asset definition to change plan messaging.
