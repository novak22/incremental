# BlogPress Creator Console

## Overview
BlogPress relocates the classic Personal Blog management experience into the browser shell. Players can now browse their entire blog network inside a CMS-flavoured workspace, inspect payouts, lock in niches, and fire off quality actions without leaving the new shell. The redesign keeps the existing blog economy intact while refreshing the presentation with a table-first overview, a dedicated detail inspector, and a pricing page that explains costs and growth levers.

## Goals
- Highlight every live and in-setup blog in a sortable table so players can immediately spot upkeep gaps and ready actions.
- Preserve the original blueprint, maintenance, quality, niche, and payout logic while exposing the data in richer panels.
- Lock niche selection to a single choice per blog and surface the niche heat map so the decision feels weighty.
- Offer a blueprint-focused launch page that mirrors the old “Launch Blueprint” flow, including requirement messaging and setup costs.
- Teach the long-term value of quality milestones, upkeep, and related upgrades through a SaaS-style pricing breakdown.

## Mapping from Classic Shell
- **Foundation cards → My Blogs table**: every blog instance renders as a table row with niche, status, payout, upkeep, quality, and a one-click action. The “Spin up new blog” button now opens the blueprint view.
- **Sidebar detail slide-over → Detail view**: selecting any row opens a dedicated management screen with overview stats, niche controls, payout recap, quality progress, upkeep warnings, and action buttons.
- **Launch blueprint button → Blueprint view**: the blueprint section shows setup time, cost, requirement messaging, and launches the existing `buildAssetAction` handler.
- **Upgrade buttons → Action panel**: quality actions (Write Post, SEO Sprint, Backlink Outreach) display with their time/cost requirements and respect usage, upgrade, and time/money gates.
- **Niche selector → Locked selector**: niches may be chosen once; after selection the dropdown is disabled and the panel reminds players the niche is locked.
- **Payout recap → Modifier list**: the latest income breakdown is rendered as a list with the base payout and modifiers pulled from the stored breakdown entries.

## Data & Logic
- Uses `buildBlogpressModel` to adapt `getAssetState('blog')`, quality helpers, maintenance summaries, and niche popularity into a view model shared with the Browser shell.
- Quick actions rely on `canPerformQualityAction`, `getQualityActionUsage`, and `performQualityAction` so availability, limits, and costs match the classic flow.
- Niche selection calls through to `assignInstanceToNiche` but the UI only presents the dropdown when the instance is still unassigned.
- Blueprint availability messages and disable reasons reuse `describeAssetLaunchAvailability` so timing/cash requirements stay consistent.
- Pricing cards list every quality level from the definition and upgrades whose `affects.assets` target blogs (Automation Course, Editorial Pipeline Suite, etc.).

## UI Notes
- Navigation mirrors the browser shell approach: “My Blogs”, “Pricing”, and “Blueprints” tabs sit inside the header with a persistent “Spin up new blog” CTA.
- Table rows highlight the currently selected blog; empty states encourage spinning up the first blueprint.
- Detail panels use the existing colour palette and card shadows, plus warm hints to keep the copy upbeat.
- Pricing view borrows SaaS patterns with plan cards, niche heat callouts, and upgrade lists to teach progression at a glance.

## Manual Test Checklist
- Launch a new blog from the blueprint view; confirm the setup cost/time is deducted and the row appears in the table.
- Assign a niche on the detail view; verify the dropdown disappears and the niche badge updates in the table.
- Run each quick action; ensure time/money requirements gate the button and the payout breakdown updates after day end.
- Skip upkeep for a day; the detail view should flag the warning and the table row should show the blog as active but with the warning badge in the panel.
