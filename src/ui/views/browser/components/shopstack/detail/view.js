export function createEmptyDetail() {
  const container = document.createElement('div');
  container.className = 'shopstack-detail__empty';
  container.textContent = 'Select an upgrade to preview its perks and requirements.';
  return container;
}
