import { getAssetDefinition } from '../../../core/state/registry.js';
import { getNicheDefinition } from '../../../game/assets/nicheData.js';

function formatPercent(value) {
  const numeric = Number(value) * 100;
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.0001) {
    return '0%';
  }
  const precision = Math.abs(numeric) >= 10 ? 0 : 1;
  const rounded = numeric.toFixed(precision);
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function describeEventTarget(event, state) {
  if (!event?.target) return '—';
  if (event.target.type === 'assetInstance') {
    const definition = getAssetDefinition(event.target.assetId);
    const assetState = state?.assets?.[event.target.assetId];
    const instance = assetState?.instances?.find(entry => entry?.id === event.target.instanceId) || null;
    const assetName = definition?.name || event.target.assetId;
    const nickname = instance?.nickname || instance?.label || null;
    const suffix = nickname ? ` (${nickname})` : instance ? ` (#${instance.id.slice(0, 6)})` : '';
    return `${assetName}${suffix}`;
  }
  if (event.target.type === 'niche') {
    const definition = getNicheDefinition(event.target.nicheId);
    return definition?.name || event.target.nicheId || 'Niche';
  }
  return '—';
}

export function renderEvents(container, state) {
  const tableBody = container.querySelector('#developer-events-body');
  const emptyNote = container.querySelector('#developer-events-empty');
  if (!tableBody) return;

  const events = Array.isArray(state?.events?.active) ? state.events.active : [];
  tableBody.innerHTML = '';

  if (!events.length) {
    if (emptyNote) emptyNote.hidden = false;
    return;
  }

  if (emptyNote) emptyNote.hidden = true;

  const doc = container.ownerDocument || document;
  events
    .slice()
    .sort((a, b) => Math.abs(b?.currentPercent || 0) - Math.abs(a?.currentPercent || 0))
    .forEach(event => {
      if (!event) return;
      const row = doc.createElement('tr');
      const impact = formatPercent(event.currentPercent || 0);
      const target = describeEventTarget(event, state);
      const remaining = `${Math.max(0, Number(event.remainingDays) || 0)} / ${Math.max(
        0,
        Number(event.totalDays) || 0
      )}`;
      const cells = [
        event.label || event.templateId || 'Event',
        impact,
        target,
        remaining,
        event.tone || 'neutral'
      ];
      cells.forEach(value => {
        const cell = doc.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
}

