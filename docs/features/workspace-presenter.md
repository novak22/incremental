# Workspace Presenter Utility

## Goals
- Provide a shared presenter factory for browser workspaces so that views can focus on their unique UI while inheriting consistent routing and summary behaviour.
- Reduce the amount of boilerplate required to manage mounts, derived summaries, and locked states across workspace modules.
- Support future Learnly and tab-sync integrations via explicit lifecycle hooks.

## Player Impact
This change is invisible to players today. It prepares the codebase for faster iteration on browser workspaces, enabling the team to ship smoother UI updates without regressions.

## Tuning Parameters
- `ensureSelection(state, model)`: optional reducer guard hook.
- `deriveSummary(model)`: prepares the summary returned to layout presenters.
- `renderLocked(model, mount, context)`: renders locked messaging when applicable.
- `renderBody(model, mount, context)`: renders the main workspace content.
- `beforeRender(context)` / `afterRender(context)`: lifecycle hooks for complex modules.
- `derivePath(state, model)`: optional route derivation used by the internal path controller.
