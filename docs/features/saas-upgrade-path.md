# SaaS Upgrade Path

## Goal
Map the late-game infrastructure ladder that powers SaaS payouts once players master automation. The path should celebrate the leap from regional uptime to a globe-spanning platform, highlighting the compounding progress bonuses that keep quality actions exciting.

## Upgrade Ladder

1. **Edge Delivery Network** – Baseline requirement that doubles SaaS quality progress and adds a 35% income boost. Serves as the launchpad for the global operations tier.
2. **Global Ops Center** – Cost: $1,550. Requires Fulfillment Automation, Automation Architecture completion, Edge Delivery Network, and two active Micro SaaS instances. Adds ~40% daily SaaS income and grants +1 progress to edge deployments.
3. **Predictive Insights Engine** – Cost: $1,950. Requires the Ops Center, Fulfillment Automation, Automation Architecture completion, and three active Micro SaaS builds. Adds another ~20% income multiplier and grants +1 progress to feature, stability, and marketing pushes.
4. **Autonomous Support Mesh** – Cost: $2,400. Requires Predictive Insights, Fulfillment Automation, Automation Architecture completion, and four active Micro SaaS builds. Adds ~25% more income, grants +1 stability and edge progress, and reduces edge deployment cooldowns to one day.

Each upgrade stacks multiplicatively with prior boosts, so fully equipped SaaS portfolios can more than double their daily subscription revenue while chewing through quality tiers at a faster clip.

## Player Impact
- Encourages spinning up multiple SaaS products before investing in expensive automation, reinforcing the portfolio mindset.
- Rewards long-term planning: Fulfillment Automation and Automation Architecture knowledge remain relevant well past the initial unlocks.
- Keeps late-stage quality actions lively by adding additive progress bonuses that stack with Edge Delivery’s multiplier.
- Reduces friction for edge deployments once the autonomous mesh is live, letting players rotate through SaaS instances without multi-day downtimes.

## Tuning Notes
- Multipliers compound to roughly 2.8× the baseline SaaS payout when all upgrades are purchased (1.35 × 1.4 × 1.2 × 1.25).
- Progress bonuses apply before the Edge Delivery multiplier so the doubled values remain intuitive (e.g., base 1 + bonuses, then ×2 when Edge is active).
- Cooldown reductions use the dynamic cooldown helper in `assets/quality.js`; verify new actions still respect day boundaries in test suites.
