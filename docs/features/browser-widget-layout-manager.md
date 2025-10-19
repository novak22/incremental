# Browser Widget Layout Manager

## Goal
Allow the browser home screen to assemble its widget grid dynamically so new widgets and custom orders can slot in without hand-editing the base HTML. The manager reuses widget controller factories from the registry and keeps rendering decoupled from markup placement.

## Player Impact
- The home screen can respect a player's preferred widget ordering each time they visit.
- Future widgets can launch in whichever order fits the story beat without altering the static template.
- Developers get a single place to refresh the layout after drag-and-drop or other reorder flows.

## Layout Flow
1. Resolve the `.browser-home__widgets` host from the element registry.
2. Read widget definitions from the registry and fetch any saved ordering from `localStorage` (falling back to registry order).
3. Clone the matching `<template data-widget-template>` fragments into a document fragment, preserving `data-widget` hooks for controllers.
4. Mount or re-mount each widget controller with the fresh container node so render calls see the latest DOM.

## Persistence Notes
- Orders are stored under the `browser.widgets.layout` key; empty layouts clear the entry instead of leaving stale arrays behind.
- Sanitization filters unknown widget IDs and appends any new registry entries so the layout stays complete even after updates.
- `setLayoutOrder` re-renders the layout immediately, making it safe to call after drag interactions or scripted swaps.

## Implementation Details
- `src/ui/views/browser/widgets/layoutManager.js` exposes a `createLayoutManager` factory so each widget host can keep isolated controller maps, layout order, and mount bookkeeping. The module still exports a default instance that proxies to the homepage host for legacy callers.
- `src/ui/views/browser/widgets/userLayoutStorage.js` mirrors the lightweight storage helpers used by the apps widget and wraps all ordering logic.
- `index.html` now exposes widget markup as `<template>` nodes, keeping the live container empty until the manager activates.
- Tests use `jsdom` to provide real template fragments so the manager can exercise its cloning logic during unit runs.

## Multi-host Support
- The homepage resolver provisions a dedicated layout manager for the `.browser-home__widgets` container and stores it alongside the resolved DOM helpers so any presenter can grab the right instance.
- Additional hosts can call `createLayoutManager({ resolveMountRecord })` to mount widgets into their own containers without sharing controller state or persisted orders.
- Default exports in `layoutManager.js` remain available for existing imports and simply proxy their calls to the active host instance (falling back to an internal manager if no host is registered yet).
