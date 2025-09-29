# Passive Asset Quality System

## Goals
- Layer a clear quality ladder inside each passive asset so players balance breadth versus depth.
- Anchor upgrades to themed actions (posts, edits, bug fixes) that reinforce each asset’s fantasy.
- Surface requirements and actions on the asset card with upbeat, confidence-boosting copy.

## Player Impact
- Assets start at Quality 0 with minimal income until the player invests in quality actions.
- Spending hours (and occasional cash) on actions forces trade-offs against other daily plans.
- Each tier upgrade widens payouts, adds celebratory logs, and unlocks asset-specific perks.

## Key Systems & Tuning

- Quality data defines tracks, tier requirements, and flavourful actions per asset.
- Daily income draws from the current tier’s band before applying existing modifiers and variance.
- Asset cards host a Quality Actions panel with progress meters, gated buttons, and positive feedback.
- Quality efforts log time/cash spend and broadcast milestone messages when levels rise.

Historical playtest data lives in [Passive Asset Quality – May 2024](../playtests/passive-asset-quality.md).
- **Quality Definitions** – Each asset definition now includes:
  - `tracks`: named progress counters (e.g., `posts`, `seo`, `support`).
  - `levels`: ordered tiers with income ranges and cumulative requirements. Example: blogs climb from $3–$6/day at Quality 0 to $64–$84/day at Quality 5.
  - `actions`: time/cash investments that advance one or more tracks with whimsical log feedback.
  - Optional `messages.levelUp` hooks for flavourful celebration copy.
- **Income Calculation** – Daily payouts pull the income band for the instance’s current quality level before running the existing variance roll and modifiers (Automation Course still multiplies blog income; high-quality vlogs gain a viral spike chance that now ramps again at the new top tiers).
- **UI Panel** – Asset cards render a “Quality Actions” panel listing owned instances, their current quality, progress toward the next tier, and clickable action buttons. Buttons are disabled when setup isn’t complete or resources are insufficient.
- **Metrics & Logs** – Quality actions record time/cash contributions under a new `quality` category and emit upbeat log entries, while level-ups post passive-style milestone messages.

## Update – Quality 5 Extension (June 2024)
- All six passive assets now feature Quality 4 and Quality 5 milestones with steeper action requirements and daily payouts that roughly double their previous caps.
- Blogs now crest at Quality 5 with $64–$84/day in ad revenue once posts, SEO sweeps, and outreach stack up.
- Vlogs reach $62–$82/day at Quality 5, and the viral bonus gains an extra bump for channels that maintain the new tiers (especially with the Cinema Camera).
- E-book series extend to Quality 5, topping out at $60–$78/day once deluxe covers and fan reviews pile in.
- Stock photo galleries scale to $112–$150/day at Quality 5 through additional shoots, edits, and marketing pushes (boosted further by the Studio Expansion).
- Dropshipping labs graduate to $130–$176/day at Quality 5 by layering more research, listing optimisations, and ad experiments.
- Micro SaaS platforms now unlock an Ecosystem Powerhouse tier worth $168–$220/day when features, stability, marketing, and edge deployments all reach late-game thresholds.

## Open Questions / Next Steps
- Tune time and cash costs once broader playtest data arrives (especially SaaS late-game loops).
- Explore assistants or upgrades that automate certain actions or soften requirements.
- Consider diminishing returns or prestige bonuses for running multiple top-tier instances.

### Implementation Checklist
- [ ] Quality tiers, tracks, and requirements defined per passive asset.
- [ ] Action costs, rewards, and log copy aligned with themed progression.
- [ ] UI shows current quality, progress, and disabled states for insufficient resources.

## Playtest Notes – Passive ROI Tightening (May 2024)
_Legacy observations below reflect the pre-extension baseline but remain useful for pacing comparisons._
- Advanced a fresh save through 35 in-game days after the payout rebalance to verify that passive income now lands in the $20–$40/day band at peak quality.
- **Blog network** reached Quality 3 on day 21 after investing 72 writing hours plus $180 setup/$180 quality cash; maintenance-adjusted payouts averaged ~$28/day, with break-even arriving around day 24.
- **Weekly vlog** cleared its new requirements on day 33 after 133.5 production hours and $652 invested; steady $32–$40 payouts covered cumulative costs by day 38, with the viral modifier creating occasional spikes without invalidating the target range.
- **E-book series** crossed Quality 3 on day 26 (100 hours, $496 sunk) and held $28–$38 royalties, recouping the spend on day 31 while still demanding 45 minutes of daily upkeep.
- **Stock galleries** needed 27 days (96.5 hours, $402 invested) to hit Quality 3, after which $26–$36/day licensing covered the spend in the following nine days.
- **Dropshipping storefront** demanded the longest climb in the commerce tier: 95 hours of listings/ads work plus $1,450 total outlay stretched break-even to day 57 even with steady $32–$40 profits.
- **SaaS micro-app** capped the playtest: 123 hours of features/support and $2,240 total spend put Quality 3 online by day 62, and maintenance-adjusted $34–$42 subscriptions kept ROI just under the 90-day mark.
