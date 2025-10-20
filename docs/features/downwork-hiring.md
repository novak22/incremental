# DownWork Hiring Hub

## Overview
DownWork now bundles a dedicated **Hire people** tab alongside the existing gig-planning board. The new view centralises assistant recruiting and staffing data so players can onboard or release Virtual Assistants without jumping to ShopStack. The gig board remains the default landing tab while staffing sits one click away within the same workspace.

## Goals
- **Surface assistant context in-place.** Show daily focus coverage, hourly payroll, and remaining slots next to the hustle planner so players understand the impact of hiring decisions immediately.
- **Streamline onboarding.** Offer a single hire button that reuses the existing assistant upgrade logic (costs, limits, logs) while presenting upbeat benefit copy.
- **Make staffing reversible.** Provide a prominent "Let assistant go" action with status-aware copy so downsizing is as frictionless as hiring.

## Player Impact
- Players can review team size, remaining capacity, and wages without digging through upgrade menus.
- Hiring and firing assistants no longer clutters the ShopStack upgrade catalog, keeping that workspace focused on equipment and boosts.
- The DownWork nav now displays quick badges (`Find gigs`, `Hire people`) that summarise available contracts and current staffing at a glance.

## Implementation Notes
- `src/ui/views/browser/apps/hustles/index.js` now renders a top-level DownWork app shell with two internal views.
- Assistant hire/fire actions reuse the existing helper functions from `src/game/assistant.js`, ensuring economy rules remain untouched.
- ShopStack’s catalog excludes the `assistant` upgrade via `EXCLUDED_UPGRADES`, preventing duplicate entry points.
- Styling lives in `styles/widgets/widgets.css` under the new `.downwork-app` and `.downwork-hiring` selectors.
