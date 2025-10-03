# Random Event Engine

## Goal
Introduce a reusable system for time-bound boosts and setbacks that can target specific assets or entire niches. The framework should outlive the old vlog-only viral spike and make it easy to plug in new modifier types later (beyond money), all while surviving save/load cycles.

## Player Impact
- **Viral streaks for every asset** – Active blogs, vlogs, dropshipping shops, SaaS products, e-books, and photo galleries can now roll into multi-day windfalls that start strong and taper each sunrise.
- **Recovering setbacks** – The same instances (and the niches they target) can suffer temporary dips—supply issues, outages, trend fatigue—that ease off day by day instead of zeroing payouts outright.
- **Explained payouts** – Event contributions land in the daily income breakdown so players can see exactly why money surged or dipped and how many days remain in the streak.

## Tuning Notes
- Asset events only trigger when upkeep is fully funded for the day. One positive or negative streak can be active per instance; chances scale with quality tier (vlog retains its higher viral odds).
- Event state is stored under `state.events.active` with `remainingDays`, `currentPercent`, and `dailyPercentChange`, so effects persist through reloads and can decay between days.
- `advanceEventsAfterDay` resolves duration ticks before the day counter increments, applies per-day change, retires expired entries, and rolls fresh niche-wide events for the next sunrise.
- All money modifiers apply as percent multipliers stacked with niche popularity, education, and upgrade effects. Negative swings clamp at zero so daily payouts never go negative.
- The architecture is future-proofed for non-income stats by tracking `stat`/`modifierType`, though only income multipliers are live right now.
