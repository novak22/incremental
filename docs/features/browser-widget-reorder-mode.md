# Browser Widget Reorder Mode

## Goal
Let players shuffle the home dashboard widgets without leaving the browser shell, keeping pointer and keyboard controls in sync while persisting the preferred layout.

## Player Impact
- Drag handles surface on every widget when reorder mode is active, making it obvious what can move.
- Keyboard users mirror the same experience with arrow/Home/End keys, so the lineup never depends on pointer-only affordances.
- Custom layouts stick thanks to the existing layout manager storage helpers, so the dashboard greets players exactly how they arranged it.

## Implementation Notes
- `index.html` now exposes a `browser-home__reorder-toggle` control plus per-widget drag handles. Widgets carry `role="listitem"` so assistive tech can announce their place in the layout.
- `styles/widgets/home.css` introduces styling for the reorder toggle, handle buttons, and drag/drop states while keeping the default view unchanged.
- `src/ui/views/browser/widgets/dragHandlers.js` centralizes DnD state management for the widget container, reusing `layoutManager.setLayoutOrder()` so DOM state and persistence stay aligned.
- `src/ui/views/browser/widgets/widgetReorderController.js` wires the toggle, drag handlers, and keyboard logic together. The controller only enables `draggable` states while reorder mode is active and updates handle labels with positional context.
- `src/ui/views/browser/layoutPresenter.js` instantiates the reorder controller during layout initialization, ensuring the controls are live whenever the browser shell loads.

## Accessibility
- Handles remain unfocusable and `aria-hidden` until reorder mode activates, preventing screen readers from tripping over dormant controls.
- When active, handles announce the widget name, current position, and instructions for arrow key movement. Widgets expose `aria-grabbed` during drag to hint at live state.
- Drop targets gain a dashed outline plus `aria-grabbed` toggles so color and assistive cues remain in lockstep.

## Future Considerations
- Consider announcing reorder updates via a polite live region for extra clarity once the notification system supports lightweight status messages.
- Additional widgets can join the lineup by defining their template and allowing the layout manager to clone them; no extra wiring is required for reorder support.
