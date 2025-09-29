# Daily Metrics Ledger

**Purpose**
- Turn the snapshot panel into a truthful recap of the last in-game day.

**What players see**
- Daily Stats highlights time spent, cash earned/spent, and study momentum with at-a-glance lists for the top three entries.
- Passive payouts post during the morning maintenance sweep so income persists into the new day’s review.
- Captions call out which assets or categories carried the day, making plan-versus-result checks easy.

**Data plumbing**
- Time categories: `setup`, `maintenance`, `hustle`, `study`, `general`.
- Earnings: `passive`, `offline`, `hustle`, `delayed`, `sale`.
- Spending: `maintenance`, `payroll`, `setup`, `investment`, `upgrade`, `consumable`.
- Metrics reset inside `endDay` after the recap renders; helpers in `renderDailyList` cap each list at three rows.

**Future hooks**
- Extend categories or copy via `src/ui/dashboard.js` as new systems land.
