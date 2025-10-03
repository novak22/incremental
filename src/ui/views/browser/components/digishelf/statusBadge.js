export default function createStatusBadge(instance = {}) {
  const badge = document.createElement('span');
  badge.className = `digishelf-badge digishelf-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  return badge;
}
