# YourNetwork Professional Profile

## Overview
YourNetwork reimagines the classic Player tab as a LinkedIn-inspired portfolio that surfaces a creator’s full CV in the new browser shell. The workspace aggregates state from skills, education, equipment, and asset registries to present an at-a-glance narrative of mastery.

## Goals
- Give players a celebratory, professional-feeling view of their progress that matches the new browser aesthetic.
- Increase discoverability of long-term goals by highlighting skill mastery, education momentum, and equipment gaps in one place.
- Reuse existing registries so the profile stays synchronized with gameplay systems without introducing new progression rules.

## Player Impact
- Players get a persistent destination to review stats, plan next upgrades, and brag about portfolio highlights.
- Education and equipment sections make unmet opportunities obvious (“Not yet purchased”, “Enroll to unlock bonuses”).
- Metrics summarise lifetime progress (earnings, spend, hours, top asset, and daily net flow) to contextualize day-to-day play.

## Data Sources & Notes
- Skills, education, and equipment data reuse `buildPlayerPanelModel`, extended to expose course progress, gear status, and locked upgrades.
- Asset highlights derive from existing asset models to spotlight top lifetime earners and last payouts.
- Career metrics combine lifetime totals from player state with the current daily summary (`computeDailySummary`).

## UI Considerations
- Sections are rendered as cards with progress meters and badges, mirroring LinkedIn “Skills”, “Certifications”, and portfolio blocks.
- Locked gear is desaturated to imply future goals, while maxed skills and completed courses receive celebratory badges.
- The hero snapshot displays quick stats (net worth, lifetime totals, current day, hours remaining) plus an upbeat tagline sourced from the character tier.
