# Browser Stylesheet Notes

The browser shell links individual CSS files from `index.html`. Keep the order lean:
1. `styles/base/theme.css`
2. `styles/base/layout.css`
3. Shared components in `styles/components/`
4. Home widgets from `styles/widgets/`
5. Workspace foundations (`styles/workspaces/workspaces.css`) and any app-specific files
6. Overlay and launch dialog rules in `styles/overlays/`

All modules assume the base tokens (`--browser-*`) and button styles already exist, so add new styles by appending a `<link>` that fits this sequence.
