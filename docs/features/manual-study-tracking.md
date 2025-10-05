# Manual Study Tracking

## Goals
- Replace the automatic study scheduler with a manual action queue so players intentionally log their course hours.
- Surface daily reminders without silently consuming time so players keep full control of their focus budget.
- Reuse the shared action-progress engine so long-running courses can track per-day participation and reward skills on completion.

## Player Impact
- Enrolling in a course now spawns a study action that waits in the queue until the player logs the required hours for the day.
- The dashboard highlights courses that still need attention and celebrates days that were logged manually.
- Courses finish (and award XP + skill boosts) once players manually log the required number of study days.

## Technical Notes
- Knowledge hustles define a `progress` template with `type: 'study'`, `hoursPerDay`, and `daysRequired`; `createRequirementsOrchestrator` seeds an action instance on enrollment.
- `allocateDailyStudy` and `advanceKnowledgeTracks` read action progress logs to update `studiedToday`, advance `daysCompleted`, emit reminders, and award skills.
- Existing saves migrate by translating enrolled courses into pending study action instances that mirror prior progress.
