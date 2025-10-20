# Project Guidance

## Vision
- Build a charming incremental (idle) game that rewards curiosity, provides clear short-term goals, and nudges players toward long-term mastery.
- Prioritize accessibility and readability so that new contributors can grasp the gameplay loop quickly.

## Coding Style
- **JavaScript Modules**: Use ES modules with one primary feature per file. Export a single default object or function alongside any necessary named helpers. Keep initialization logic in `init()` functions and avoid global variables; encapsulate state within module scopes.
- **UI Tone**: Write UI copy that is upbeat, encouraging, and lightly whimsical. Favor concise instructions and tooltips that celebrate progress.
- **CSS & HTML**: Maintain semantic markup and class names that describe purpose rather than presentation.

## Documentation & Knowledge Management
- Favor the slim handbook: start with the curated index in `docs/docs-inventory.md` and update the existing handbook page that covers your change. Only add a brand new page when a system launches or player onboarding would otherwise be unclear.
- Reserve `docs/features/` notes for substantial, multi-stage features; cross-link them from the handbook instead of duplicating content.
- Keep new write-ups concise so the living handbook stays under the 20 % footprint goal. Trim or refactor older sections while you work; if content is no longer active guidance, compress it or move it to the archive (see below).
- When player-facing behavior shifts, record it in the lightweight format described in `docs/changelog.md`. Use short, dated bullet lists; move long-form background material into the archive instead of expanding the main changelog.
- Routine maintenance, copy tweaks, or purely technical refactors generally do **not** need handbook edits—update the changelog only if the player experience changes.

### Archiving & Legacy Notes
- Retire superseded material by moving the file under `docs/archive/` and adding an `archive` row in `docs/docs-inventory.md` that points to the new location.
- When archiving, leave a brief pointer in the original handbook section (or remove the reference entirely if it is no longer relevant) so readers are not sent to stale instructions.
- For generated artifacts (economy charts, spreadsheets, etc.), store them under the relevant `docs/archive/<topic>/` folder and link back from the changelog entry that announced the change.

## README Expectations
- Whenever gameplay systems change (e.g., resource flow, progression pacing, prestige mechanics), update the `README.md` with an overview of the new system and instructions on how to experience it in-game.

## Verification & Automation
- Run `npm test` locally before committing; it executes the Node test suite (including the economy and UI model checks).
- When your change touches the core loop or economy math, add targeted runs such as `npm test -- tests/gameLifecycle.test.js tests/economyMath.test.js` to confirm the hot paths stay green.
- For UI wiring or integration updates, run `npm test -- tests/ui/update.integration.test.js` to cover the smoke flow without opening a browser.
- Document any additional ad-hoc validation (for example, CSV regenerations or manual sanity checks) in the pull request description instead of relying on a browser pass.

## Repository Structure
- Place reference material and design documents in `docs/`.
- Store visual and audio assets in `assets/`.
- Use `docs/ui/` for mockups and UI flow charts.

