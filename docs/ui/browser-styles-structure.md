# Browser UI stylesheet structure

## Load order to keep in `index.html`
1. **Base / theme** – global tokens and layout scaffolding from `styles/base/theme.css` followed by `styles/base/layout.css`.
2. **Shared components** – cross-shell UI such as buttons, address bar, and notifications (`styles/components/buttons.css`, `styles/components/layout.css`, `styles/components/notifications.css`).
3. **Dashboard widgets** – shared home widgets and helpers loaded in this sequence: `styles/widgets/widgets.css`, `styles/widgets/home.css`, `styles/widgets/apps.css`, `styles/widgets/todo.css`, `styles/widgets/bank.css`.
4. **Workspace modules** – the general foundation in `styles/workspaces/workspaces.css` followed by app-specific files: `learnly.css`, `shopstack.css`, `videotube.css`, `shopily.css`, `serverhub.css`, and `timodoro.css`.
5. **Overlays & launch flows** – modal overlay shell, launch dialog skin, and keyframes from `styles/overlays/launch-dialog.css`.

Keeping this load order preserves variable definitions, shared utility mixins, and the expectation that workspace modules can rely on prior base/widget styles without redefining them.

## Cross-section dependencies to watch
- **Design tokens** – All sections rely on the base `--browser-*` properties for color, spacing, radius, and shadows. Workspace themes (e.g., Shopily, ServerHub) only redefine shades via these tokens, so the base variables must load first.
- **Home spacing variables** – The global `.browser-stage__pane--home` defines `--browser-home-spacing`, `--browser-home-widget-gap`, and `--browser-home-widget-spacer`, which are consumed by widgets (`.browser-home__widgets`, `.apps-widget`, etc.). When extracting widgets ensure the home pane rules remain upstream.
- **Shared widget state** – `.browser-button` variants and `.browser-button.is-spinning` are referenced by multiple modules (home widgets trigger the spinner, server/workspace buttons inherit pill radii). Keep the base button styles adjacent to utilities so workspace-specific buttons (ShopStack, ServerHub) can inherit transitions and radius tokens.
- **Dark mode hooks** – Several workspaces add `:root[data-browser-theme="night"] …` overrides (Learnly, VideoTube). These selectors assume the base night theme variables are already defined and cascade into module styles. Future modules should follow the same pattern rather than redefining root colors.
- **Launch dialog skins** – The shared overlay component (`body.has-launch-dialog`, `.launch-dialog…`) sits in the overlay section but is re-themed per workspace via modifiers (`.launch-dialog--blogpress`, `--digishelf`, `--serverhub`). When splitting files keep the overlay core before any brand-specific modifiers so additional workspaces can append their skins.

Documenting these dependencies should help future contributors decide where to place new rules and avoid regressions when the stylesheet is modularized.
