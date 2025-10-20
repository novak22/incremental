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
- Knowledge hustles now publish market metadata for each course (free tracks marked always-on, paid tracks flagged as limited seats) so Learnly enrollment flows through `acceptHustleOffer` and the shared action pipeline.
- Knowledge track definitions still provide a `progress` template with `type: 'study'`, `hoursPerDay`, and `daysRequired`, but the orchestrator focuses on syncing knowledge progress, recording tuition spend, and awarding completions after the market offer is claimed.
- `allocateDailyStudy` and `advanceKnowledgeTracks` read action progress logs to update `studiedToday`, advance `daysCompleted`, emit reminders, and award skills.
- Existing saves migrate by translating enrolled courses into pending study action instances that mirror prior progress.
