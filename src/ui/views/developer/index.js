import { subscribeToInvalidation } from '../../../core/events/invalidationBus.js';
import { renderDeveloperView } from './render.js';

let unsubscribe = null;

function toggleBrowserShell(rootDocument, hidden) {
  const doc = rootDocument || document;
  const shell = doc.querySelector('.browser-shell');
  if (shell) {
    if (hidden) {
      shell.setAttribute('hidden', 'true');
      shell.setAttribute('aria-hidden', 'true');
    } else {
      shell.removeAttribute('hidden');
      shell.removeAttribute('aria-hidden');
    }
  }
}

export function hideDeveloperView(rootDocument) {
  const doc = rootDocument || document;
  const container = doc.getElementById('developer-root');

  if (container) {
    container.hidden = true;
    container.setAttribute('aria-hidden', 'true');
  }

  doc.body?.classList.remove('developer-view-active');
  toggleBrowserShell(doc, false);
}

function bindRefresh(rootDocument) {
  const doc = rootDocument || document;
  const button = doc.getElementById('developer-refresh-button');
  if (!button || button.dataset.bound === 'true') return;
  button.addEventListener('click', () => {
    renderDeveloperView(doc);
  });
  button.dataset.bound = 'true';
}

const developerView = {
  id: 'developer',
  name: 'Developer Tools',
  onActivate({ root } = {}) {
    const doc = root || document;
    const container = doc.getElementById('developer-root');
    if (!container) {
      return;
    }

    container.hidden = false;
    container.removeAttribute('aria-hidden');
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }
    doc.body?.classList.add('developer-view-active');
    toggleBrowserShell(doc, true);
    bindRefresh(doc);
    renderDeveloperView(doc);

    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = subscribeToInvalidation(() => renderDeveloperView(doc));
  }
};

export default developerView;
