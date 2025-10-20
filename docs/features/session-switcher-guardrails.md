# Session Switcher Guardrails

## Goals
- Preserve player progress by making every session swap write the active slot to storage before loading the next run.
- Keep the save-slot roster self-healing so deleting a session or finding an empty index always results in a valid active slot.
- Surface trustworthy "last saved" copy in the switcher panel so QA can confirm timestamps line up with recent actions.

## Player & Tester Impact
- When players bounce between experimental runs, their current slot autosaves first, preventing any mid-switch losses.
- Deleting a slot or arriving with no active session immediately lands testers in a fresh default run, eliminating confusing blank states.
- The switcher sorts slots by most recent save and updates the active pill instantly, so reviewers can see which timeline is live at a glance.

## Implementation Notes
- `initSessionSwitcher` wires `onSaveSession` ahead of `onActivateSession`, ensuring `storage.saveState()` runs before reloading another slot.
- `SessionRepository.ensureSession()` now seeds an index entry whenever none exists, migrating legacy single-slot saves and assigning an active session automatically.
- `SessionRepository.deleteSession()` removes the snapshot, clears the slot from the index, and delegates to `ensureSession()` so the UI always has a follow-up session to focus.
- The switcher controller re-renders after persistence operations, keeping the summary pill and list metadata synchronized with the repository's `lastSaved` timestamps.

## Manual Testing
1. **Create a session**
   - Open the session switcher, choose *Start new session*, enter a custom name, and confirm the game reloads into a fresh day with a success toast.
2. **Switch sessions**
   - With two slots available, perform an in-game action to change state, open the switcher, and activate the secondary slot. The current session should save, the UI reloads, and the pill reflects the new slot and timestamp.
3. **Delete a session**
   - From the switcher list, delete a non-active slot (confirming the prompt). The entry disappears, the remaining slot stays active, and the summary pill continues to report the correct save timestamp.
