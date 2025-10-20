import { collectActionSnapshots } from './actions/snapshots.js';
import { renderActionStats } from './actions/stats.js';
import { renderActionEntry } from './actions/renderers.js';

export function renderActionMemory(container, state) {
  const list = container.querySelector('#developer-actions-list');
  const empty = container.querySelector('#developer-actions-empty');
  if (!list) return;

  const doc = list.ownerDocument || container.ownerDocument || document;
  const entries = collectActionSnapshots(state);

  renderActionStats(container, entries);
  list.innerHTML = '';

  if (!entries.length) {
    if (empty) {
      empty.hidden = false;
    }
    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  entries.forEach((entry, index) => {
    list.appendChild(renderActionEntry(doc, entry, index));
  });
}

