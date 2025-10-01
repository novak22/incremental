import { getElement } from '../../elements/registry.js';

function toggleLogTip(logTip, isEmpty) {
  if (!logTip) return;
  logTip.hidden = !isEmpty;
  if (logTip.style) {
    logTip.style.display = isEmpty ? 'block' : 'none';
  }
}

function createEntryNode(template, entry) {
  if (!template?.content) {
    return null;
  }

  const fragment = template.content.cloneNode(true);
  const entryRoot = fragment.querySelector('.log-entry');
  if (entryRoot) {
    const typeClass = entry.type ? `type-${entry.type}` : '';
    if (typeClass) {
      entryRoot.classList.add(typeClass);
    }
    if (entry.id) {
      entryRoot.dataset.logEntryId = entry.id;
    }
  }

  const timestampEl = fragment.querySelector('.timestamp');
  if (timestampEl) {
    timestampEl.textContent = entry.timeLabel || '';
  }

  const messageEl = fragment.querySelector('.message');
  if (messageEl) {
    messageEl.textContent = entry.message || '';
  }

  return fragment;
}

export function render(model = {}) {
  const { logFeed, logTemplate, logTip } = getElement('logNodes') || {};
  if (!logFeed || !logTemplate) {
    return;
  }

  const entries = Array.isArray(model?.entries) ? model.entries : [];
  const isEmpty = model?.isEmpty ?? entries.length === 0;

  toggleLogTip(logTip, isEmpty);

  logFeed.innerHTML = '';

  if (isEmpty) {
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {
    const node = createEntryNode(logTemplate, entry);
    if (node) {
      fragment.appendChild(node);
    }
  });

  logFeed.appendChild(fragment);
  logFeed.scrollTop = 0;
}

const logPresenter = { render };

export default logPresenter;
