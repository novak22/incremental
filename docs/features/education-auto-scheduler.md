# Auto-Scheduled Education Tracks

**Purpose**
- Courses behave like real commitments: tuition upfront, fixed lengths, and automatic daily study time.

**Key behavior**
- Enrolling charges tuition (Outline $140, Photo $95, Commerce $260, Automation $540) and triggers same-day scheduling.
- `allocateDailyStudy` books hours each morning after payroll, but now leaves a buffer for maintenance and at least a quarter of the day for manual hustle time. If time still runs out the course logs a warning and tries again next day.
- Completion clears the enrollment flag and fires celebratory logs plus skill XP grants.

**UI cues**
- Education cards show countdowns, tuition, and daily load straight from definitions with badges like Ready, Enrolled, Logged today, Graduated.
- Progress strips pair percentage with "days complete / days left" so graduation timing stays obvious.
- The study queue header spells out the auto-scheduled ordering and flags that manual tweaks are still on deck.

**Design notes**
- Study time reserves before maintenance, but respects upkeep buffers so passive assets stay funded and the player retains breathing room.
- Tuition targets mid-game savings (roughly a work week of early hustles).
