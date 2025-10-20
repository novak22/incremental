# Quick Actions & Timodoro Daily Flow

## Goals
- Surface high-value hustle offers as quick actions with consistent metadata and CTA copy.
- Keep recurring assistant activity and today’s stats modular so Timodoro can reuse sections across future workspaces.
- Ensure the dashboard model produces clear availability signals (hours, money, run counts) without duplicating formatting logic.

## Quick Actions Flow
1. **Data extraction** – `extractQuickActionCandidates` gathers hustle offers, requirement locks, and runtime metrics (hours, payout, expiry) while keeping raw state isolated from UI code.
2. **Filtering & prioritization** – offer groups are filtered by availability, fallback selections are created when nothing is active, and the list is sorted by urgency and ROI inside `filters.js`.
3. **Rendering hints** – `hints.js` owns button labels, meta text, and disabled copy so UI presenters only consume ready-to-render strings. The model still exposes numeric values for scheduling and queue logic.
4. **Action model** – the dashboard provider composes quick actions, in-progress tasks, and asset upgrade data into registries so view code simply binds lists to cards.

## Timodoro Sections
- **Focus Queue** – `todoSection.js` now highlights the next actionable entry with a hero call-to-action before listing grouped tasks, keeping the primary sprint obvious without hiding the original queues.
- **Queue intel** – grouped task lists now surface every upgrade requirement across upcoming quality levels and add a subtle "Do now" micro-CTA whenever the queue entry is runnable, nudging players to pounce on ready boosts.
- **Recurring Section** – `recurringSection.js` renders maintenance/assistant logs, sharing list helpers with other workspaces.
- **Summary Column** – `summarySection.js` condenses streaks, hour stats, and earnings into the "Daily pulse" card so tests still find the same dataset roles while the layout feels more like an energized productivity sim.

## Snapshot & Recurring Stats
- The Daily pulse card keeps hour availability and streak copy in one place, while `buildTimodoroViewModel` exposes friendlier labels (`focusStreakLabel`, `Cash hauled`, etc.) for other presenters to reuse.
- Recurring lists reuse the same task list renderer as ToDo items, ensuring assistant reports remain visually consistent with manual tasks.

## Future Considerations
- Add focused metrics (e.g., ROI bands) to quick actions by extending hints without touching extraction logic.
- Explore sharing the recurring card with workspace dashboards outside Timodoro by keeping dependencies limited to generic list components.
