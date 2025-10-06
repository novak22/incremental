import { appendStatRow, formatStatusLabel } from './renderers.js';
import { summarizeActionInstanceCounts } from './snapshots.js';

export function renderActionStats(container, entries) {
  const statsSection = container.querySelector('#developer-actions-stats');
  const statsList = container.querySelector('[data-dev-actions-stats]');
  if (!statsSection || !statsList) {
    return;
  }

  const doc = statsList.ownerDocument || container.ownerDocument || document;
  statsList.innerHTML = '';

  if (!entries.length) {
    statsSection.hidden = true;
    return;
  }

  const summary = summarizeActionInstanceCounts(entries);
  appendStatRow(doc, statsList, 'Total instances', Math.max(0, Math.floor(summary.total)));

  Object.entries(summary.statuses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([status, count]) => {
      const label = formatStatusLabel(status);
      appendStatRow(doc, statsList, `${label} instances`, Math.max(0, Math.floor(count)));
    });

  statsSection.hidden = false;
}

export default renderActionStats;
