# Education Curriculum Expansion

## Overview
The education roster now spans seven advanced programs that deepen the study-to-income loop. Each course introduces a specific fantasy—ranging from post-production labs to syndication residencies—and doubles as a mechanical bridge between daily study time, instant hustles, and passive assets. Graduates earn both a XP windfall and new payout modifiers that light up the log whenever they trigger.

## New Study Tracks
- **Curriculum Design Studio** – 6 days · 2.5h/day · $280 tuition. Grants +30% Pop-Up Workshop payouts and +15% Bundle Promo Push upsells.
- **Post-Production Pipeline Lab** – 8 days · 3h/day · $360 tuition. Adds +35% to Vlog Edit Rush hustles and +18% to Weekly Vlog Channel passive income.
- **Fulfillment Ops Masterclass** – 7 days · 2h/day · $320 tuition. Boosts Dropship Pack Party earnings by +25% and raises Dropshipping Product Lab revenue by +35%.
- **Customer Retention Clinic** – 5 days · 2h/day · $210 tuition. Layers +$8 onto SaaS Bug Squash gigs and +25% to SaaS Micro-App subscriptions.
- **Narration Performance Workshop** – 4 days · 1.75h/day · $190 tuition. Adds +30% to Audiobook Narration payouts and +15% e-book royalties.
- **Gallery Licensing Summit** – 5 days · 2.25h/day · $240 tuition. Increases Event Photo Gig income by +30% and Stock Photo Gallery royalties by +22%.
- **Syndication Residency** – 6 days · 2h/day · $300 tuition. Multiplies Freelance Writing by +20%, adds +$2 to Street Promo Sprint stipends, and raises Personal Blog Network income by +18%.

Every course specifies its tuition, daily study commitment, XP reward weights, and the hustles/assets affected. Track descriptions use the same upbeat, whimsical tone as existing study content.

## Passive Asset Modifiers
Education bonuses now support passive income. `educationEffects` builds a bonus index for both hustles and assets, `rollDailyIncome` records applied modifiers, and asset payout logs append a celebratory “Study boost” note with the track summary. Asset breakdowns retain their existing structure so payout breakdown UI continues to function.

## Testing Notes
- Added regression coverage to `tests/education.test.js` to ensure the new curriculum appears in `KNOWLEDGE_TRACKS`/`KNOWLEDGE_REWARDS` and that asset-level boosts register.
- Extended `tests/hustles.test.js` to verify Pop-Up Workshop multipliers, dropshipping passive income boosts, and the celebratory log line when payouts include study bonuses.
