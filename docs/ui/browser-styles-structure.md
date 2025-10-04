# Browser UI stylesheet structure

## Load order to enforce after splitting
1. **Base / theme** – global tokens, layout shell, and utility rules that define `--browser-*` variables, chrome, tabs, layout wrappers, and home spacing helpers. (Current file lines 19-555.)
2. **Shared widgets & utilities** – reusable widgets (todo, bank, apps), notifications, generic cards/pages, About You / Bank app details, and supporting animations. (Lines 556-2410.)
3. **Workspace modules** – app-specific bundles loaded in the order they appear now so overrides cascade correctly:
   - Digishelf (2411-2922)
   - BlogPress (2928-3475)
   - Learnly (3480-4022)
   - ShopStack (4030-4575)
   - VideoTube (4582-5051)
   - Shopily (5056-5902)
   - Trends (5908-6252)
   - ServerHub (6259-7002)
4. **Overlays & launch flows** – modal overlay shell, launch dialog skin, and keyframes (7007-7221).

Keeping this load order preserves variable definitions, shared utility mixins, and the expectation that workspace modules can rely on prior base/widget styles without redefining them.

## Cross-section dependencies to watch
- **Design tokens** – All sections rely on the base `--browser-*` properties for color, spacing, radius, and shadows. Workspace themes (e.g., Shopily, ServerHub) only redefine shades via these tokens, so the base variables must load first.
- **Home spacing variables** – The global `.browser-stage__pane--home` defines `--browser-home-spacing`, `--browser-home-widget-gap`, and `--browser-home-widget-spacer`, which are consumed by widgets (`.browser-home__widgets`, `.apps-widget`, etc.). When extracting widgets ensure the home pane rules remain upstream.
- **Shared widget state** – `.browser-button` variants and `.browser-button.is-spinning` are referenced by multiple modules (home widgets trigger the spinner, server/workspace buttons inherit pill radii). Keep the base button styles adjacent to utilities so workspace-specific buttons (ShopStack, ServerHub) can inherit transitions and radius tokens.
- **Dark mode hooks** – Several workspaces add `:root[data-browser-theme="night"] …` overrides (Learnly, VideoTube). These selectors assume the base night theme variables are already defined and cascade into module styles. Future modules should follow the same pattern rather than redefining root colors.
- **Launch dialog skins** – The shared overlay component (`body.has-launch-dialog`, `.launch-dialog…`) sits in the overlay section but is re-themed per workspace via modifiers (`.launch-dialog--blogpress`, `--digishelf`, `--serverhub`). When splitting files keep the overlay core before any brand-specific modifiers so additional workspaces can append their skins.

Documenting these dependencies should help future contributors decide where to place new rules and avoid regressions when the stylesheet is modularized.
