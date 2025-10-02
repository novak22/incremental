import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../../../../game/assets/niches.js';

export function getNicheHintText(info, summaries = []) {
  if (info?.popularity?.summary) {
    return info.popularity.summary;
  }
  if (summaries[0]?.popularity?.summary) {
    return summaries[0].popularity.summary;
  }
  if (info?.definition?.id) {
    return 'Boosting demand with a specialty audience.';
  }
  return 'Pick a niche to sync with daily demand.';
}

export function createInstanceNicheSelector(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__niche-selector';

  const label = document.createElement('span');
  label.className = 'asset-detail__niche-label';
  label.textContent = 'Audience sync';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'asset-detail__niche-dropdown';
  const info = getInstanceNicheInfo(instance);
  const summariesSource = getAssignableNicheSummaries(definition);
  const summaries = Array.isArray(summariesSource) ? summariesSource : [];

  const options = summaries
    .map(entry => ({
      value: entry?.definition?.id || '',
      label: entry?.definition?.name || entry?.definition?.id || '',
      modifier: entry?.popularity?.label || ''
    }))
    .filter(option => option.value && option.label);

  options.unshift({ value: '', label: 'Unassigned' });
  options.forEach(option => {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.modifier ? `${option.label} (${option.modifier})` : option.label;
    select.appendChild(node);
  });
  select.value = info?.definition?.id || '';

  select.addEventListener('change', () => {
    const assetId = definition?.id || instance?.definitionId;
    assignInstanceToNiche(assetId, instance.id, select.value);
  });

  const hint = document.createElement('p');
  hint.className = 'asset-detail__niche-note';
  hint.textContent = getNicheHintText(info, summaries);

  container.appendChild(select);
  container.appendChild(hint);

  return container;
}

export function buildNicheInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--niche';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Audience niche';
  container.appendChild(title);

  const info = getInstanceNicheInfo(instance);
  if (!info) {
    const summary = document.createElement('p');
    summary.className = 'asset-detail__insight-body';
    summary.textContent = 'Unassigned — pick a niche below to sync with daily demand.';
    container.appendChild(summary);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = info.summary;
  container.appendChild(summary);

  if (info.modifier) {
    const modifier = document.createElement('p');
    modifier.className = 'asset-detail__insight-note';
    modifier.textContent = info.modifier;
    container.appendChild(modifier);
  }

  return container;
}
