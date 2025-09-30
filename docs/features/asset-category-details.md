# Asset Category Details Slider

## Feature Goals
- Give players immediate access to launch requirements, upkeep expectations, and earning projections for each asset category.
- Celebrate each asset's quality journey so players can plan upgrades without opening individual instances.
- Keep information dense yet readable inside the existing slide-over pattern for consistency with other detail views.

## Player Impact
- Reduces guesswork before committing time or money to a new asset build.
- Encourages comparing categories by surfacing upkeep and payout ranges side-by-side.
- Highlights quality milestone requirements, making it easier to target study and equipment upgrades.

## Implementation Notes
- Each asset category header now includes a **Details** button that opens the global slide-over.
- The slide-over lists every asset in that category. Each entry reuses the `createAssetDetailHighlights` blueprint to present:
  - Setup duration and cost.
  - Daily upkeep cost/time expectations.
  - Income ranges and latest yield summaries.
  - Requirement callouts plus full quality progression ladders.
- Styling tweaks ensure the blueprint cards read well in the slide-over context while matching the existing aesthetic.

## Tuning Hooks
- Asset definitions already manage their `detailEntries`; the slider automatically reflects future tuning to setup, upkeep, or quality data.
- Category notes (`ASSET_GROUP_NOTES`) feed the intro copy, so narrative teams can adjust tone per group without code changes.
