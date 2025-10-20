# Session Management & Save Slots

## Goals
- Allow designers and playtesters to spin up alternate save files without overwriting their primary progression.
- Keep legacy saves compatible by detecting the original `online-hustle-sim-v2` snapshot and treating it as the default session slot.
- Expose a simple API surface (`listSessions`, `createSession`, `renameSession`, `deleteSession`, `setActiveSession`) that mirrors the existing persistence workflow.
- Support simple export/import tooling so balancing notes and QA saves can be shared between teammates without poking at storage directly.

## Player & Tester Impact
- Researchers can snapshot progress before major balance experiments, then hop back to their main run with a single storage call.
- QA can reproduce bug reports by cloning a session, manipulating its state, and returning to the original slot without wiping data.
- Designers can time-travel across different builds (e.g., "day 10 economy" vs. "fresh onboarding") by maintaining multiple session IDs in `localStorage`.

## Implementation Notes
- A new `SessionRepository` keeps an index document under `online-hustle-sim-v2:sessions`:
  ```json
  {
    "activeSessionId": "default",
    "sessions": {
      "default": {
        "id": "default",
        "name": "Main Hustle",
        "storageKey": "online-hustle-sim-v2:session:default",
        "lastSaved": 1700000000000,
        "metadata": {}
      }
    }
  }
  ```
- Each session entry records its `storageKey`, allowing the default slot to keep using the legacy `online-hustle-sim-v2` blob when present.
- On initialization the repository migrates any pre-session single-slot save stored at `online-hustle-sim-v2` into the default session, copying the snapshot to `online-hustle-sim-v2:session:default`, preserving `lastSaved`, and deleting the stale root key to avoid duplicates. The migration is versioned so future session index changes can build on the same runner.
- `StatePersistence` now resolves the snapshot key via the session repository before every load/save and updates `lastSaved` metadata after successful writes.
- `createStorage` wraps the repository helpers so switching the active session automatically replays the existing persistence pipeline (`loadState`, migrations, default seeding, etc.).
- `createStorage` also exposes `exportSession` and `importSession` helpers that serialize the active slot to JSON (including metadata and migrated snapshots) and hydrate new slots from uploaded payloads.
- Tests cover creating a second session, swapping back to the primary slot, and pruning extra saves to ensure the index stays tidy.

### Save Slot Guardrails
- The session switcher now calls `saveState()` before applying `setActiveSession` so the outgoing slot always lands the latest progress on disk.
- Repository helpers backfill an active slot when the index is empty, migrating legacy single-slot saves or spinning up a fresh default session on demand.
- Deleting a slot routes through the repository to remove its snapshot and immediately focus whichever session `ensureSession()` returns next.

## Browser Session Switcher
- The browser chrome now includes a "Active session" pill next to the End Day button. It surfaces the slot name, the most recent save timestamp, and opens a management panel on click.
- The session panel lists every slot with quick actions to activate, rename, or delete entries. Destructive steps (delete/reset) prompt for confirmation before clearing progress.
- Starting a new session or resetting the active slot routes through the persistence helpers so the fresh state loads instantly and all UI subscriptions are rehydrated.
- A "Start new session" shortcut spins up an empty slot and switches focus immediately, while "Reset current session" wipes the active slot’s snapshot but keeps its name for rapid iteration.
- A sharing section at the bottom now offers "Export active session" to download a JSON save and "Import session file" to spin up a new slot from a teammate’s snapshot, complete with cheerful guidance copy.

## Follow-Up Ideas
- Surface the session list in the developer HUD with quick actions to clone or archive a slot.
- Attach optional metadata (`notes`, `createdAt`, build identifiers) so balancing sessions can carry richer context for collaborators.
