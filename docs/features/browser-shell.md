# Browser Shell View

## Goals
- Provide a browser-inspired chrome for the incremental game to explore multi-surface UI experiments.
- Highlight top-level navigation (address bar, session controls, pinned sites) as composable widgets.
- Keep gameplay logic intact by reusing the existing state, registry, and command pipeline.

## Player Impact
- Players gain a high-level "homepage" where shortcuts and streak trackers can surface before diving into deeper dashboards.
- The pinned site rail encourages quick swapping between feature areas without overwhelming the main dashboard.
- Session controls remain reachable in the chrome, reinforcing end-of-day and command palette actions.

## Implementation Notes
- Introduced `browser.html` as an alternate entry point that loads the existing game scripts with a new DOM skeleton.
- Added `src/ui/views/browser/` with dedicated resolvers wired to the browser chrome and widget containers.
- A standalone stylesheet (`styles/browser.css`) scopes the new visual language without touching the classic layout.
- `src/main.js` now detects `data-ui-view` on the document body to pick between the classic and browser views during boot.
- Browser presenters reuse the shared dashboard and card models to render homepage widgets plus BlogPress, VideoTube, ShopStack, and Learnly service pages inside the chrome shell.
- Layout navigation tracks a lightweight history stack so the browser buttons, pinned sites, and address bar all stay in sync.
