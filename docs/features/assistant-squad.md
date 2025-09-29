# Assistant Staffing System

## Goals
- Expand the upgrade loop into a light workforce management layer that trades cash for daily time.
- Reinforce ongoing money sinks so late-game stockpiles remain meaningful.
- Introduce reversible decisions (firing assistants) with immediate scheduling consequences.

## Player Impact
- Players can hire up to four virtual assistants; each adds +2h to the daily schedule but introduces $30/day in payroll.
- Assistants are paid before the daily maintenance allocator runs, reducing the cash available for asset upkeep.
- Daily upkeep now fills the assistant queue first, then spills over to the player. If both the team and the player run out of hours, upkeep fails for that asset.
- Firing an assistant instantly removes their bonus hours, which can push the player into negative time and cause end-of-day auto wrap-ups if nothing remains.

## Key Systems & Tuning
- **Hiring Cost** – $180 upfront per assistant. Hiring is blocked if the player cannot afford the fee or already has four assistants.
- **Payroll** – $15/hour, with each assistant covering 2h daily. Payroll is charged at the dawn of each day. If funds are insufficient the balance drops to zero and a warning log fires.
- **Time Budget Changes** – Bonus time is tracked in `state.bonusTime`. Assistants reserve their hours for upkeep allocation; overflow maintenance draws from the player’s remaining time. Firing subtracts the 2h contribution immediately, potentially driving `timeLeft` below zero. Negative time prevents additional maintenance from funding.
- **UI Feedback** – Upgrade card shows team size, per-assistant payroll, and total daily payroll. A secondary button enables firing assistants at any time.
