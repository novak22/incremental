# ShopStack Platform

## Overview
- ShopStack replaces the legacy Upgrades tab with a full-screen store launched from the browser shell. Players reach it from the ShopStack icon on the homepage apps widget and open it in a dedicated workspace tab.
- The app consumes the existing upgrade registry so costs, requirements, repeatable logic, effects, and purchase actions still flow through the original backend.
- Layout mirrors a modern marketplace with a hero header, category filters, search, and upbeat branding so players can browse and buy without leaving the browser shell.

## Catalog Experience
- The catalog renders all upgrade categories and families already defined in the backend model; each card shows name, description, price, status badge, effect summary, and prerequisite callouts.
- Search filters by the backend-provided keyword index while category chips let players jump between Tech, Infra, Support, and other groupings as the catalog grows.
- Locked items remain visible but greyed out, using live requirement checks and affordability flags so players know which milestones to chase next.
- Clicking a card opens a sticky product detail panel with breadcrumbs, price, “Buy now” call-to-action, bonus highlights (effects, slot changes, unlock strings), and a requirement checklist that marks satisfied prerequisites.
- High-tier commerce upgrades (Fulfillment Automation Suite, Global Supply Mesh, White-Label Alliance) now route to Shopily so the storefront keeps core hardware/infra gear while commerce teams shop inside their dedicated app.

## Purchase Flow & Detail Panel
- The detail panel mirrors e-commerce PDPs with cost, status badge, affordability copy (“Need $X more”), and a deep-dive list built from the upgrade definition’s detail functions (e.g., payroll reminders, progress notes).
- “Buy now” buttons reuse the existing `definition.action` handlers; the UI disables the buttons when cash or requirements are missing so backend validation stays intact without duplicate logic.
- The layout stays sticky on large screens so players can scan catalog cards and detail specs side-by-side; on narrow viewports it collapses into a single column for readability.

## My Purchases Hub
- A dedicated tab lists every owned upgrade, including repeatable helpers like assistants (detected via state counts and stored purchase days).
- Each purchase card highlights the effect summary, upkeep reminders (payroll, subscriptions, daily limits), and the day the item was acquired when available.
- Entries rely on the same backend state objects so upgrades removed by exclusivity swaps disappear automatically.

## Pricing FAQ & Guidance
- The Pricing FAQ tab serves as an in-universe help center explaining the instant purchase flow, why tiles might be locked, and how upkeep surfaces in the My Purchases tab.
- Copy keeps the whimsical tone (“Browse upgrades, compare bonuses, and fuel your next spike”) while nudging players toward next steps if they’re cash-poor or requirement-gated.

## Implementation Notes
- Upgrade state now records the in-game day of purchase so My Purchases can timestamp owned items without altering payout logic.
- The ShopStack renderer exposes `data-upgrade` attributes on cards to keep shared layout filters functional across browser shells.
- Styles live in `styles/browser.css` and respect the existing theme variables so day/night mode flips without extra overrides.
