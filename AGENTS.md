# Project Guidance

## Vision
- Build a charming incremental (idle) game that rewards curiosity, provides clear short-term goals, and nudges players toward long-term mastery.
- Prioritize accessibility and readability so that new contributors can grasp the gameplay loop quickly.

## Coding Style
- **JavaScript Modules**: Use ES modules with one primary feature per file. Export a single default object or function alongside any necessary named helpers. Keep initialization logic in `init()` functions and avoid global variables; encapsulate state within module scopes.
- **UI Tone**: Write UI copy that is upbeat, encouraging, and lightly whimsical. Favor concise instructions and tooltips that celebrate progress.
- **CSS & HTML**: Maintain semantic markup and class names that describe purpose rather than presentation.

## Documentation of Features
- For every new feature, create or update a design note in `docs/features/` detailing goals, player impact, and any tuning parameters.
- Include a changelog entry in `docs/changelog.md` summarizing gameplay adjustments.

## README Expectations
- Whenever gameplay systems change (e.g., resource flow, progression pacing, prestige mechanics), update the `README.md` with an overview of the new system and instructions on how to experience it in-game.

## Manual Testing Requirements
- Before committing, run through the current build in a desktop browser and validate the primary gameplay loop (resource collection, upgrades, progression triggers). Document any manual test steps and outcomes in commit messages or PR descriptions.

## Repository Structure
- Place reference material and design documents in `docs/`.
- Store visual and audio assets in `assets/`.
- Use `docs/ui/` for mockups and UI flow charts.

