# Browser Notifications Center

## Goals
- Surface the event log inside the browser chrome so players can review recent activity without opening a separate panel.
- Track unread status per entry so new events stand out with a badge and can be cleared intentionally.
- Offer lightweight controls (dropdown, mark all) that feel native to modern notification trays.

## Player Impact
- A bell icon in the browser header now shows a badge with the count of unread log entries.
- Clicking the bell opens a dropdown listing the full event log with timestamps and type labels; unread items are highlighted.
- Players can mark individual entries read by tapping them or clear the entire list with "Mark all as read".
- Read state persists with the save data so the badge only reflects new events that appeared since the last check.

## Implementation Notes
- Each log entry in `state.log` now includes a `read` flag; legacy saves are normalized on load.
- The browser notifications presenter renders the dropdown, updates the unread badge, and reuses the shared event log model for formatting.
- `markLogEntryRead` and `markAllLogEntriesRead` helpers live in `src/core/log.js` and trigger UI refreshes when state changes.
- Styling lives in `styles/components/notifications.css` alongside other browser chrome rules, using the accent palette for unread indicators.
- Logs generated for passive income ticks and completed upgrades are auto-marked as read so routine upkeep doesn't inflate the unread count.
