# Player Overview Screen

**Purpose**
- Give players a dedicated home to review character growth, study plans, and purchased gear without hunting through other panels.
- Highlight momentum stats that tie together cash flow, assistants, and study activity so the next decision feels obvious.

**What players see**
- A "Career snapshot" card summarizing level, XP progress, day count, cash on hand, and remaining focus hours.
- A "Skill journey" list that ranks every discipline with tier badges, XP totals, and next-tier requirements.
- Education rows for each workshop showing enrollment state, tuition paid, and whether today’s session is booked.
- An equipment locker that only lists upgrades already purchased, with quick reminders of what each unlocks.
- Momentum metrics covering assistants employed, passive earnings, upkeep spend, study queue status, and focus already booked.

**Data plumbing**
- Skills and character tiers reuse definitions from `src/game/skills/data.js`; XP formatting matches the dashboard widget.
- Knowledge progress taps `getKnowledgeProgress` for enrollment, completion, and study scheduling state per track.
- Equipment list reads `registry.upgrades` but filters to non-repeatable purchases via `getUpgradeState`.
- Momentum stats combine registry asset counts, assistant state, and daily summary metrics computed in `computeDailySummary`.

**Future hooks**
- Add prestige, reputation, or perk systems as new cards without altering the navigation shell.
- Surface historical trends (XP/day, cash delta) by extending the momentum metrics list to charts or sparklines.
- Integrate customizable loadouts once multiple gear sets exist, reusing the equipment locker list structure.
