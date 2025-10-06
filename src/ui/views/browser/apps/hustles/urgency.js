export function decorateUrgency(node, remainingDays) {
  if (!node) return;
  const numeric = Number(remainingDays);
  node.classList.toggle('is-critical', Number.isFinite(numeric) && numeric <= 1);
  node.classList.toggle('is-warning', Number.isFinite(numeric) && numeric > 1 && numeric <= 3);
}

export default {
  decorateUrgency
};
