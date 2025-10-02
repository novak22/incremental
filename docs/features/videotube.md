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
