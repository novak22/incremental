# DigiShelf Digital Library

## Overview
DigiShelf unifies the Digital E-Book Series and Stock Photo Gallery systems inside the browser shell. The workspace mirrors a SaaS
content platform: hero metrics highlight active catalogues, tabs swap between asset tables and a pricing explainer, and a detail
panel surfaces niches, payouts, milestones, and ROI in one glance. Under the hood the original asset definitions, upkeep loops,
and payout modifiers remain untouched—DigiShelf simply pipes the data into refreshed UI components so existing saves continue to
behave exactly as before.

## Goals
- Provide a hero dashboard that celebrates portfolio stats (active series, active galleries, combined royalties) with a launch CTA.
- Deliver dedicated tables for e-books and stock photos, complete with quick actions, upkeep status, and detail slide-outs.
- Keep niche selection single-use per asset and expose modifier breakdowns so players understand each income bonus.
- Offer a Pricing & Plans view that explains setup costs, upkeep, and average payouts using SaaS-style plan cards.
- Maintain all classic logic for setup, maintenance, quality progression, modifiers, and ROI tracking without duplication.

## Mapping from Classic Shell
- **Classic cards → Tables**: instances from `getAssetState('ebook')` and `getAssetState('stockPhotos')` render as table rows with
  status badges, payout summaries, upkeep labels, and quick-action buttons.
- **Detail modal → Detail sidebar**: selecting any row opens a management column showing niche info, quality progress, payout
  breakdowns, lifetime spend vs. earnings, and the full list of quality actions.
- **Launch buttons → Publish panel**: the "Publish a new resource" CTA exposes launch cards that reuse each definition’s existing
  `action` handler plus requirement messaging from `describeAssetLaunchAvailability`.
- **Pricing copy → Plan cards**: setup/maintenance numbers and knowledge/equipment requirements pull directly from the asset
  definitions so the explainer always reflects tuning changes.

## Data & Logic
- Uses `buildDigishelfModel` to aggregate both asset definitions, instance state, quality milestones, payout breakdowns, and ROI.
- Quick actions respect `canPerformQualityAction`, usage limits, time, and cash gates before calling `performQualityAction`.
- Niche selection routes through `selectDigishelfNiche` (alias of `assignInstanceToNiche`) and only appears until a niche is
  locked in.
- Lifetime spend and ROI borrow helper calculations from the shared asset helpers to avoid duplicating formulas.
- Pricing cards compute average daily payouts from quality level 2 of each definition, giving a mid-tier expectation snapshot.

## UI Notes
- The hero panel mirrors modern SaaS dashboards with stat pills, upbeat copy, and a toggleable launch panel for resource creation.
- Tabs keep navigation compact: E-Books, Stock Photos, and Pricing & Plans live inline with stateful highlighting.
- Tables use soft-accent highlights for the selected row and show quick actions (Write Volume, Launch Gallery, Upload Batch) as
  pill buttons.
- Detail panels reuse the browser palette, offer progress bars for milestones, and surface modifiers in a tidy list.
- Pricing cards emphasise opportunity framing—setup, upkeep, average payout, and required prep steps.

## Manual Test Checklist
- Launch a new e-book or gallery through the Publish panel; confirm setup costs/hours deduct and the row appears in the proper tab.
- Assign a niche for a fresh asset; verify the dropdown disappears afterward and the table badge updates.
- Run each quick action (Write Volume, Launch Gallery, Upload Batch); ensure time/money requirements gate the buttons and the
  payout recap updates after advancing the day.
- Skip upkeep for a day; both the table and detail panel should flag the missed maintenance status.
- Review the Pricing view; confirm setup, upkeep, and requirement values match the underlying asset definitions.
