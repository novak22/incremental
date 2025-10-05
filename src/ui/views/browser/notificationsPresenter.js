import { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import { markAllLogEntriesRead, markLogEntryRead } from '../../../core/log.js';
import { buildEventLogModel } from '../../dashboard/notificationsModel.js';
import { activateShellPanel } from '../../layout/index.js';

const TYPE_LABELS = {
  success: 'Success',
  warning: 'Alert',
  danger: 'Alert',
  info: 'Update',
  educationpayoff: 'Study Boost'
};

const presenterState = {
  isOpen: false,
  entries: [],
  emptyMessage: '',
  outsideHandler: null,
  keydownHandler: null,
  initialized: false
};

function resolveShellPanelTarget(action = {}) {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const panelId = typeof action.panelId === 'string' && action.panelId.trim();
  if (panelId) {
    return panelId;
  }

  const targetId = typeof action.targetId === 'string' && action.targetId.trim();
  if (targetId) {
    return targetId;
  }

  const tabId = typeof action.tabId === 'string' && action.tabId.trim();
  if (!tabId) {
    return null;
  }

  if (tabId.startsWith('panel-')) {
    return tabId;
  }

  if (tabId.startsWith('tab-')) {
    return `panel-${tabId.slice(4)}`;
  }

  return tabId;
}

function getRefs() {
  return getElement('browserNotifications') || {};
}

function attachDocumentListeners() {
  if (!presenterState.outsideHandler) {
    presenterState.outsideHandler = event => {
      if (!presenterState.isOpen) return;
      const { container } = getRefs();
      const target = event.target;
      if (!container || (target instanceof Node && container.contains(target))) {
        return;
      }
      togglePanel(false);
    };
  }

  if (!presenterState.keydownHandler) {
    presenterState.keydownHandler = event => {
      if (!presenterState.isOpen) return;
      if (event.key === 'Escape') {
        togglePanel(false);
      }
    };
  }

  document.addEventListener('click', presenterState.outsideHandler, true);
  document.addEventListener('keydown', presenterState.keydownHandler);
}

function detachDocumentListeners() {
  if (presenterState.outsideHandler) {
    document.removeEventListener('click', presenterState.outsideHandler, true);
  }
  if (presenterState.keydownHandler) {
    document.removeEventListener('keydown', presenterState.keydownHandler);
  }
}

function focusFirstEntry() {
  const { list } = getRefs();
  if (!list) return;
  const firstButton = list.querySelector('.browser-notifications__item');
  firstButton?.focus({ preventScroll: true });
}

function openPanel() {
  const { panel, button } = getRefs();
  if (!panel || !button) return;
  panel.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  presenterState.isOpen = true;
  attachDocumentListeners();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => focusFirstEntry());
  } else {
    focusFirstEntry();
  }
}

function closePanel() {
  const { panel, button } = getRefs();
  if (panel) {
    panel.hidden = true;
  }
  if (button) {
    button.setAttribute('aria-expanded', 'false');
  }
  presenterState.isOpen = false;
  detachDocumentListeners();
}

function ensurePanelHiddenByDefault() {
  if (presenterState.initialized) return;
  const { panel, button } = getRefs();
  if (!panel || !button) return;
  panel.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  presenterState.initialized = true;
}

function togglePanel(force) {
  const next = typeof force === 'boolean' ? force : !presenterState.isOpen;
  if (next) {
    openPanel();
  } else {
    closePanel();
  }
}

function formatTypeLabel(type) {
  if (!type) return '';
  const normalized = String(type).toLowerCase();
  return TYPE_LABELS[normalized] || normalized.replace(/\b\w/g, char => char.toUpperCase());
}

function getUnreadEntries(entries = []) {
  return entries.filter(entry => entry && entry.read !== true);
}

function renderBadge(entries = []) {
  const { badge, button } = getRefs();
  if (!badge || !button) return;
  const unread = entries.filter(entry => entry && entry.read !== true).length;
  if (unread > 0) {
    badge.hidden = false;
    badge.textContent = unread > 99 ? '99+' : String(unread);
  } else {
    badge.hidden = true;
    badge.textContent = '0';
  }
  const labelBase = 'View notifications';
  const label = unread > 0 ? `${labelBase} (${unread} unread)` : labelBase;
  button.setAttribute('aria-label', label);
  button.title = label;
}

function renderEmptyState(entries = [], emptyMessage = '') {
  const { empty } = getRefs();
  if (!empty) return;
  const unread = getUnreadEntries(entries);
  if (!unread.length) {
    empty.hidden = false;
    empty.textContent = emptyMessage || 'You are all caught up.';
  } else {
    empty.hidden = true;
    empty.textContent = '';
  }
}

function createEntryButton(entry) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'browser-notifications__item';
  button.dataset.entryId = entry.id;

  if (entry.read !== true) {
    button.classList.add('is-unread');
  }

  const indicator = document.createElement('span');
  indicator.className = 'browser-notifications__indicator';
  indicator.setAttribute('aria-hidden', 'true');
  if (entry.read === true) {
    indicator.classList.add('is-hidden');
  }
  button.appendChild(indicator);

  const message = document.createElement('span');
  message.className = 'browser-notifications__message';
  message.textContent = entry.message || '';
  button.appendChild(message);

  const meta = document.createElement('span');
  meta.className = 'browser-notifications__meta';

  const typeLabel = formatTypeLabel(entry.type);
  if (typeLabel) {
    const typeBadge = document.createElement('span');
    typeBadge.className = 'browser-notifications__meta-label';
    typeBadge.textContent = typeLabel;
    meta.appendChild(typeBadge);
  }

  if (entry.timeLabel) {
    const time = document.createElement('span');
    time.textContent = entry.timeLabel;
    meta.appendChild(time);
  }

  if (meta.childNodes.length) {
    button.appendChild(meta);
  }

  button.addEventListener('click', () => {
    if (entry?.action?.type === 'shell-tab') {
      const targetPanel = resolveShellPanelTarget(entry.action);
      if (targetPanel) {
        activateShellPanel(targetPanel);
        togglePanel(false);
      }
    }

    if (entry.read === true) {
      return;
    }
    const changed = markLogEntryRead(entry.id);
    if (changed) {
      refreshFromState();
    }
  });

  return button;
}

function renderList(entries = []) {
  const { list } = getRefs();
  if (!list) return;
  const unreadEntries = getUnreadEntries(entries);
  list.innerHTML = '';
  unreadEntries.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    const button = createEntryButton(entry);
    item.appendChild(button);
    list.appendChild(item);
  });
  list.hidden = unreadEntries.length === 0;
}

function refreshFromState() {
  const state = getState();
  if (!state) return;
  const model = buildEventLogModel(state);
  render(model);
}

function handleTriggerClick(event) {
  event.preventDefault();
  togglePanel();
}

function handleMarkAllClick(event) {
  event.preventDefault();
  const updated = markAllLogEntriesRead();
  if (updated > 0) {
    refreshFromState();
  }
}

function bindControls() {
  const { button, markAll } = getRefs();
  if (button && button.dataset.notificationsBound !== 'true') {
    button.addEventListener('click', handleTriggerClick);
    button.dataset.notificationsBound = 'true';
  }
  if (markAll && markAll.dataset.notificationsBound !== 'true') {
    markAll.addEventListener('click', handleMarkAllClick);
    markAll.dataset.notificationsBound = 'true';
  }
}

function render(model = {}) {
  const refs = getRefs();
  if (!refs?.button) {
    closePanel();
    return;
  }

  ensurePanelHiddenByDefault();

  bindControls();

  presenterState.entries = Array.isArray(model?.allEntries) ? model.allEntries : [];
  presenterState.emptyMessage = model?.emptyMessage || 'You are all caught up.';

  renderBadge(presenterState.entries);
  renderList(presenterState.entries);
  renderEmptyState(presenterState.entries, presenterState.emptyMessage);

  const { markAll } = getRefs();
  if (markAll) {
    const hasUnread = presenterState.entries.some(entry => entry && entry.read !== true);
    markAll.disabled = !hasUnread;
    markAll.setAttribute('aria-disabled', String(!hasUnread));
  }

  if (presenterState.isOpen) {
    openPanel();
  } else {
    closePanel();
  }
}

export default {
  render,
  refresh: refreshFromState
};
