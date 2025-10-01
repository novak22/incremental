export function createBadge(label) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = label;
  return span;
}

export default createBadge;
