import { MAX_LOG_ENTRIES } from './constants.js';
import { createId } from './helpers.js';
import { getState } from './state.js';
import elements from '../ui/elements.js';

export function addLog(message, type = 'info') {
  const state = getState();
  if (!state) return;
  const entry = {
    id: createId(),
    timestamp: Date.now(),
    message,
    type
  };
  state.log.push(entry);
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log.splice(0, state.log.length - MAX_LOG_ENTRIES);
  }
  renderLog();
}

export function renderLog() {
  const state = getState();
  if (!state) return;
  if (!state.log.length) {
    elements.logTip.style.display = 'block';
    elements.logFeed.innerHTML = '';
    return;
  }

  elements.logTip.style.display = 'none';
  elements.logFeed.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const entries = [...state.log].sort((a, b) => b.timestamp - a.timestamp);
  for (const item of entries) {
    const node = elements.logTemplate.content.cloneNode(true);
    const entryEl = node.querySelector('.log-entry');
    entryEl.classList.add(`type-${item.type}`);
    node.querySelector('.timestamp').textContent = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    node.querySelector('.message').textContent = item.message;
    fragment.appendChild(node);
  }
  elements.logFeed.appendChild(fragment);
  elements.logFeed.scrollTop = 0;
}
