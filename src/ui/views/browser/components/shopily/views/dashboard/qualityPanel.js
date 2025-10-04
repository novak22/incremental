export default function createQualitySection(instance, helpers = {}) {
  const fragment = document.createDocumentFragment();
  if (instance.qualityInfo?.description) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = instance.qualityInfo.description;
    fragment.appendChild(note);
  }
  const progress = document.createElement('div');
  progress.className = 'shopily-progress';
  const fill = document.createElement('div');
  fill.className = 'shopily-progress__fill';
  fill.style.setProperty('--shopily-progress', String((instance.milestone?.percent || 0) * 100));
  progress.appendChild(fill);
  const summary = document.createElement('p');
  summary.className = 'shopily-panel__note';
  summary.textContent = instance.milestone?.summary || 'Push quality actions to unlock the next tier.';
  fragment.append(progress, summary);
  return fragment;
}
