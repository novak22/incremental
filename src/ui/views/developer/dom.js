export function setText(root, selector, value) {
  const node = root?.querySelector?.(selector);
  if (node) {
    node.textContent = value;
  }
}

