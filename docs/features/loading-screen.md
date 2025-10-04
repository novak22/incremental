# Browser Boot Loading Screen

## Goals
- Mask the initial asset and stylesheet load with a themed splash that reassures players the shell is spinning up.
- Keep the overlay lightweight so it appears instantly and fades away as soon as the UI is interactive.
- Mirror the upbeat hustle tone with copy that celebrates progress even before the dashboard appears.

## Implementation Notes
- `index.html` now boots with a `.boot-loader` overlay that renders before the browser shell markup. The element includes an animated orb and friendly copy while staying accessible with `role="status"` and polite live region hints.
- Styling lives in `styles/overlays/loading-screen.css`, leaning on existing theme tokens for light and night palettes. The orb pulses via keyframes while the backdrop layers a gradient glow and subtle star field.
- `src/ui/bootLoader.js` exports `dismissBootLoader()`, which marks the overlay as exiting and removes it after the fade transition completes. `src/main.js` calls the helper on the next animation frame once the primary presenters have rendered so the splash disappears seamlessly.
- Motion respects `prefers-reduced-motion`, collapsing the animation to a static badge for players who opt out of movement.

## Player Impact
- Players land on an immediate visual cue that the hustle hub is loading instead of staring at a blank browser frame.
- The themed copy sets expectations that widgets, upgrades, and streaks are syncing, lowering anxiety around longer cold starts.
- The quick fade avoids blocking input once the shell is ready, making the experience feel smoother without slowing down experienced players.
