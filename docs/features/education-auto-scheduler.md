# Auto-Scheduled Education Tracks

## Goals
- Make study commitments feel like real courses with upfront tuition and multi-day schedules.
- Reduce repetitive clicks by auto-booking daily class time once a player enrolls.
- Preserve clarity in the log and summary so players can confirm where their hours went.

## Mechanics
- Tuition is paid immediately on enrollment: Outline Mastery $140, Photo Catalog $95, E-Commerce Playbook $260, Automation Architecture $540.
- Course lengths now stretch to 5/4/7/10 days respectively, holding their daily hour costs at 2h, 1.5h, 2.5h, and 3h.
- `enrollInKnowledgeTrack` handles tuition payment, logging, and triggers a same-day scheduling sweep.
- `allocateDailyStudy` runs each morning after assistant payroll, consuming hours for every active course until the daily budget runs out.
- When time is insufficient, the scheduler logs the affected course and tries again the next day without penalising progress.
- Completion marks the course finished, clears the enrollment flag, and surfaces a celebratory log entry.

## Tuning Notes
- Tuition prices align with mid-game savings (roughly 3–5 days of early hustles) so players plan purchases.
- Automatic scheduling consumes hours before asset maintenance, ensuring study promises stay consistent.
- Summary metrics count only enrolled courses, with "scheduled" status appearing once time is booked for the day.
