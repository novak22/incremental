# Session Management & Save Slots

## Goals
- Allow designers and playtesters to spin up alternate save files without overwriting their primary progression.
- Keep legacy saves compatible by detecting the original `online-hustle-sim-v2` snapshot and treating it as the default session slot.
- Expose a simple API surface (`listSessions`, `createSession`, `renameSession`, `deleteSession`, `setActiveSession`) that mirrors the existing persistence workflow.

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
- `StatePersistence` now resolves the snapshot key via the session repository before every load/save and updates `lastSaved` metadata after successful writes.
- `createStorage` wraps the repository helpers so switching the active session automatically replays the existing persistence pipeline (`loadState`, migrations, default seeding, etc.).
- Tests cover creating a second session, swapping back to the primary slot, and pruning extra saves to ensure the index stays tidy.

## Follow-Up Ideas
- Surface the session list in the developer HUD with quick actions to clone or archive a slot.
- Attach optional metadata (`notes`, `createdAt`, build identifiers) so balancing sessions can carry richer context for collaborators.
