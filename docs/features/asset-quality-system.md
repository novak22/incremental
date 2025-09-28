# Passive Asset Quality System

## Goals
- Add a progression ladder inside each passive asset so players choose between launching breadth and deepening quality.
- Tie quality upgrades to thematic actions (posts, edits, bug fixes) instead of generic "upgrade" clicks.
- Surface quality requirements and actions directly on asset cards with encouraging UI copy.

## Player Impact
- Every new asset instance starts at Quality 0 and earns a tiny trickle until the player invests in quality actions.
- Quality actions consume daily hours (and sometimes cash), forcing trade-offs against maintenance, hustles, or study time.
- Reaching a new quality tier bumps payout ranges, triggers celebratory log lines, and unlocks asset-specific perks (e.g., vlog viral chances, course synergy for blogs).

## Key Systems & Tuning
- **Quality Definitions** – Each asset definition now includes:
  - `tracks`: named progress counters (e.g., `posts`, `seo`, `support`).
  - `levels`: ordered tiers with income ranges and cumulative requirements. Example: blogs climb from $1–$3/day at Quality 0 to $70–$120/day at Quality 3.
  - `actions`: time/cash investments that advance one or more tracks with whimsical log feedback.
  - Optional `messages.levelUp` hooks for flavourful celebration copy.
- **Income Calculation** – Daily payouts pull the income band for the instance’s current quality level before running the existing variance roll and modifiers (Automation Course still multiplies blog income; high-quality vlogs gain a viral spike chance).
- **UI Panel** – Asset cards render a “Quality Actions” panel listing owned instances, their current quality, progress toward the next tier, and clickable action buttons. Buttons are disabled when setup isn’t complete or resources are insufficient.
- **Metrics & Logs** – Quality actions record time/cash contributions under a new `quality` category and emit upbeat log entries, while level-ups post passive-style milestone messages.

## Open Questions / Next Steps
- Tune hour/cash costs once broader playtest data arrives (particularly for late-game SaaS quality actions).
- Explore assistant or upgrade interactions that automate specific quality actions or reduce requirements.
- Consider diminishing returns or prestige bonuses for maintaining multiple high-quality instances in the same asset family.
