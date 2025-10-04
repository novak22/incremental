# Browser stylesheet modules

The browser shell loads its styling from modular source folders. Each folder maps to a slice of the interface so contributors can focus on a single workspace or widget without scrolling through a monolithic bundle.

## Source directories
- `styles/base/` – Global tokens, layout primitives, typography, and shared utilities (`.browser-stage`, `.browser-button`, CSS variables, dark theme hooks).
- `styles/components/` – Cross-shell components that multiple views share (tabs, overlays, notifications, modal chrome).
- `styles/widgets/` – Dashboard widgets that appear on the home view (apps grid, cash snapshot, ToDo list, quick stats).
- `styles/workspaces/` – App-specific layouts and thematic tweaks for BankApp, BlogPress, Learnly, Shopily, Trends Intelligence Lab, ServerHub, VideoTube, DigiShelf, and ShopStack.
- `styles/overlays/` – Launch flows, confirmation dialogs, and shared animation keyframes.

## Load order
Stylesheets are linked individually from `index.html`. Keep the following sequence so custom properties, widget scaffolding, and workspace overrides cascade correctly:

1. **Base** – `styles/base/theme.css`, then `styles/base/layout.css`.
2. **Components** – shared UI like buttons, chrome, notifications, and address bar modules in `styles/components/`.
3. **Widgets** – dashboard surfaces in `styles/widgets/`, starting with `widgets.css` before more specific widgets.
4. **Workspaces** – the general `workspaces.css` foundation followed by each app-specific file.
5. **Overlays** – modal and launch dialog styling from `styles/overlays/`.

When you add a new module, append a `<link rel="stylesheet">` entry in `index.html` that keeps this ordering intact.
