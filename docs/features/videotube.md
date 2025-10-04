# VideoTube Studio

## Goal
VideoTube transforms the original vlog asset interface into a full browser workspace that mirrors the vibe of pro creator dashboards. Players can now manage every vlog channel from one stage, inspect earnings and quality milestones, and launch new videos without dipping back into the classic shell.

## Player Impact
- **Channel dashboard** – Lists every vlog instance with daily payout, lifetime earnings, niche badge, and quick quality action buttons.
- **Detail inspector** – Surfaces quality progress, payout breakdowns, ROI insights, and lets players trigger any vlog quality action with clear cost/time previews.
- **Creation flow** – Guides players through naming a video, selecting a niche, and confirming setup/upkeep costs before launching the vlog asset.
- **Analytics tab** – Highlights top earning videos and niche performance so players can steer their strategy.
- **Niche + naming tools** – Players can lock a niche from the detail view and rename channels to keep branding consistent.

## Tuning Notes
- Channel stats summarize lifetime and daily earnings plus average milestone momentum. This keeps expectations aligned with vlog payouts.
- Quick actions respect the existing daily limits/time costs and route through the existing `performQualityAction` API.
- Launch flow uses the existing asset action, then applies the chosen title/niche with `setAssetInstanceName` and `assignInstanceToNiche` to preserve backend behaviour.
- Analytics uses live lifetime and latest payout data—no extra history was stored to avoid persistence churn.

## Workspace Architecture
- `createAssetWorkspacePresenter` drives the VideoTube shell module, wiring dashboard, detail, hidden creation, and analytics views alongside the shared header so navigation state, summaries, and locks remain consistent with other asset workspaces.【F:src/ui/views/browser/components/videotube/createVideoTubeWorkspace.js†L92-L178】
- The header injects a persistent “Create New Video” action and reuses the shared tab theming so players can swap views without losing context.【F:src/ui/views/browser/components/videotube/header.js†L1-L30】
- The dashboard view pairs a stats rail with the sortable-like channel table, enabling quick actions, quality previews, and detail navigation directly from the workspace.【F:src/ui/views/browser/components/videotube/views/dashboardView.js†L1-L178】
- Detail panels support renaming, niche locking, payout breakdowns, and milestone tracking while sharing quick-action hooks with the dashboard for parity.【F:src/ui/views/browser/components/videotube/views/detailView.js†L1-L200】
- The create view mirrors the classic launch flow but now lives in-shell, summarizing setup/upkeep costs, enforcing availability rules, and calling back into the workspace to focus the newly launched video.【F:src/ui/views/browser/components/videotube/views/createView.js†L1-L104】

## Follow-up Tech Debt
- The workspace still rewraps header markup manually after render; migrate this layout tweak into the shared header renderer to avoid DOM poking each frame.【F:src/ui/views/browser/components/videotube/createVideoTubeWorkspace.js†L128-L148】
