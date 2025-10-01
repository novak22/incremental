# Browser Shell View

## Goals
- Provide a browser-inspired chrome for the incremental game to explore multi-surface UI experiments.
- Highlight top-level navigation (address bar, session controls, pinned sites) as composable widgets.
- Keep gameplay logic intact by reusing the existing state, registry, and command pipeline.
- Shape the homepage as a launchpad with modular widgets and an app shortcut grid instead of dashboard-length feeds.

## Player Impact
- Players gain a high-level "homepage" where shortcuts, quick tasks, and earnings cues surface before diving into deeper dashboards.
- The shortcut grid keeps only unlocked surfaces visible while status badges highlight available actions at a glance.
- Session controls remain reachable in the chrome, reinforcing end-of-day and command palette actions, and a theme toggle matches lighting preference.
- The TODO widget lets players check off actions as they trigger them, logging completions so momentum feels tangible.
- Compact earnings and notification widgets keep money flow and upgrade alerts scannable without overwhelming the launch screen.

## Implementation Notes
- Introduced `browser.html` as an alternate entry point that loads the existing game scripts with a new DOM skeleton.
- Added `src/ui/views/browser/` with dedicated resolvers wired to the browser chrome, shortcut grid, theme toggle, and widget containers.
- A standalone stylesheet (`styles/browser.css`) scopes the new visual language without touching the classic layout.
- `src/main.js` now detects `data-ui-view` on the document body (or an `?ui=` feature flag) to pick between the classic and browser views during boot.
- Browser presenters reuse the shared dashboard and card models to render homepage widgets plus BlogPress, VideoTube, ShopStack, and Learnly service pages inside the chrome shell.
- Layout navigation tracks a lightweight history stack so the browser buttons, pinned sites, and address bar all stay in sync.
- Browser chrome exposes a "Classic Shell" button so players can hop back to the legacy dashboard while the browser view matures.
- Modular widget controllers (`todoWidget`, `earningsWidget`, `notificationsWidget`) accept data models from the dashboard presenter so new cards can slot into the grid without touching DOM glue elsewhere.
- The homepage stylesheet now supports light and dark themes driven by a persistent toggle that updates both the shell wrapper and root theme tokens.
