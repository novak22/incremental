# Shopily Commerce Platform

## Overview
Shopily transforms the classic dropshipping venture interface into a modern SaaS-style dashboard inside the browser shell. The new workspace ships with a hero banner, daily KPI strip, and detail inspector so players can launch, monitor, and upgrade every shop without leaving the browser shell. The layout mirrors BlogPress/Learnly patterns for consistency while adopting a Shopify-inspired tone.

## Goals
- Surface high-level metrics (store count, daily sales, upkeep, net) as soon as the page loads.
- Provide a table + sidebar experience for inspecting payouts, niches, ROI, and upgrade-ready actions for each shop instance.
- Mirror the existing dropshipping backend: launch flows, upkeep checks, payout breakdowns, niche bonuses, and upgrade effects all reuse the classic logic.
- Showcase every commerce upgrade that targets dropshipping alongside affordability status and effect summaries.
- Offer a pricing page with playful copy that explains setup costs, upkeep expectations, and payout ladders using live definition data.

## Implementation Notes
- Reuses `buildShopilyModel` to adapt `getAssetState('dropshipping')`, quality helpers, and upgrade snapshots into a view model consumed by `shopily.js`.
- Quality actions route through `performQualityAction('dropshipping', …)` so buttons behave identically to the classic dashboard.
- Niche selection uses `assignInstanceToNiche` under the hood and locks once set.
- Upgrade cards call the underlying upgrade action `onClick` handlers; status badges rely on `getUpgradeSnapshot`.
- Pricing cards read setup/maintenance values from the dropshipping asset definition so future tuning automatically updates the UI.
- The upgrades tab now mirrors a mobile top-up catalog: cards show highlights, cost, readiness tone, and a "View product" action that opens a detail panel with full ShopStack-style specs, requirements, and buy button.
- High-tier commerce upgrades formerly sold through ShopStack (Fulfillment Automation Suite, Global Supply Mesh, White-Label Alliance) render exclusively here so players manage all storefront boosters in one place.
- Workspace URLs expose `upgrades/<id>` segments so selecting a product updates the browser shell path and keeps deep links in sync.

## Future Enhancements
- Add analytics view (daily revenue chart, top modifiers) once the finance history service exposes commerce-specific slices.
- Layer in assistant/todo integrations so ready-to-run quality actions push into the homepage focus widget.
- Support additional store archetypes (print-on-demand, subscription boxes) once new asset definitions land.
