# Browser stylesheet modules

The browser shell stylesheet is now compiled from modular source folders. Each folder maps to a slice of the interface so contributors can focus on a single workspace or widget without scrolling through the full bundle.

## Source directories
- `styles/base/` – Global tokens, layout primitives, typography, and shared utilities (`.browser-stage`, `.browser-button`, CSS variables, dark theme hooks).
- `styles/components/` – Cross-shell components that multiple views share (tabs, overlays, notifications, modal chrome).
- `styles/widgets/` – Dashboard widgets that appear on the home view (apps grid, cash snapshot, ToDo list, quick stats).
- `styles/workspaces/` – App-specific layouts and thematic tweaks for BankApp, BlogPress, Learnly, Shopily, Trends Intelligence Lab, ServerHub, VideoTube, DigiShelf, and ShopStack.
- `styles/overlays/` – Launch flows, confirmation dialogs, and shared animation keyframes.

When you touch one of these folders, regenerate the bundled stylesheet before you commit.

## Build command
Run the CSS build step anytime you change a module:

```bash
npm run build:css
```

The script concatenates the modular sources into `styles/browser.css`, preserving the load order documented in `docs/ui/browser-styles-structure.md`. Commit the regenerated bundle so the browser shell stays in sync for players who pull from `main`.
