import { getElement } from '../../elements/registry.js';
import setText from '../../dom.js';
import {
  createMetricTile,
  createShortcutButton,
  createNotificationItem
} from './components/widgets.js';

const FOCUS_METRICS = [
  { key: 'dailyPlus', label: 'Daily inflow', icon: '💸', source: 'header' },
  { key: 'dailyMinus', label: 'Daily outflow', icon: '💳', source: 'header' },
  { key: 'timeAvailable', label: 'Hours ready', icon: '⏱️', source: 'header' },
  { key: 'net', label: 'Net momentum', icon: '📈', source: 'kpis' }
];

function resolveNotificationAction(entry) {
  if (!entry?.action) return null;
  if (entry.action.type === 'shell-tab') {
    const tabId = entry.action.tabId;
    return () => {
      const { shellTabs = [] } = getElement('shellNavigation') || {};
      shellTabs.find(tab => tab.id === tabId)?.click();
    };
  }
  if (typeof entry.action === 'function') {
    return () => entry.action();
  }
  return null;
}

function renderFocusWidget(headerMetrics = {}, kpis = {}) {
  const widgets = getElement('homepageWidgets') || {};
  const focus = widgets.focus || {};
  const container = focus.container;
  if (!container) return;
  container.innerHTML = '';

  const notes = [];

  FOCUS_METRICS.forEach(entry => {
    const target = entry.source === 'kpis' ? kpis?.[entry.key] : headerMetrics?.[entry.key];
    if (!target) return;
    const tile = createMetricTile({
      icon: entry.icon,
      label: entry.label,
      value: target.value || '—',
      note: target.note || ''
    });
    if (target.note) {
      notes.push(target.note);
    }
    container.appendChild(tile);
  });

  if (focus.note) {
    const summary = notes.filter(Boolean).slice(0, 2).join(' • ');
    setText(focus.note, summary || 'Cashflow and time updates refresh with every loop tick.');
  }
}

function renderShortcuts(quickActions = {}) {
  const widgets = getElement('homepageWidgets') || {};
  const shortcuts = widgets.shortcuts || {};
  const container = shortcuts.container;
  if (!container) return;

  container.innerHTML = '';
  const entries = Array.isArray(quickActions.entries) ? quickActions.entries.filter(Boolean) : [];

  if (!entries.length) {
    if (shortcuts.note) {
      setText(shortcuts.note, quickActions.emptyMessage || 'No quick plays ready. Check upgrades or ventures.');
    }
    return;
  }

  entries.slice(0, 6).forEach(entry => {
    const button = createShortcutButton(entry);
    container.appendChild(button);
  });

  if (shortcuts.note) {
    const label = quickActions.defaultLabel || 'Queue';
    const copy = `Tap a shortcut to ${label.toLowerCase()} it instantly.`;
    setText(shortcuts.note, copy);
  }
}

function renderUpdates(notifications = {}) {
  const widgets = getElement('homepageWidgets') || {};
  const updates = widgets.updates || {};
  const list = updates.list;
  if (!list) return;
  list.innerHTML = '';

  const entries = Array.isArray(notifications.entries) ? notifications.entries.filter(Boolean) : [];
  if (!entries.length) {
    if (updates.note) {
      setText(updates.note, notifications.emptyMessage || 'All quiet for now. Keep the empire buzzing.');
    }
    return;
  }

  entries.slice(0, 4).forEach(entry => {
    const item = createNotificationItem(entry, resolveNotificationAction);
    list.appendChild(item);
  });

  if (updates.note) {
    setText(updates.note, 'Latest signals from upkeep, upgrades, and the queue.');
  }
}

function renderHomepageShell(session = {}) {
  const homepage = getElement('homepage') || {};
  if (homepage.heading) {
    setText(homepage.heading, session.statusText || 'Browser Homepage');
  }
  if (homepage.tagline) {
    const money = session.moneyText || '$0';
    setText(homepage.tagline, `Wallet humming at ${money}. Deploy those hours with style.`);
  }
}

function renderDashboard(viewModel = {}) {
  if (!viewModel) return;
  renderHomepageShell(viewModel.session || {});
  renderFocusWidget(viewModel.headerMetrics || {}, viewModel.kpis || {});
  renderShortcuts(viewModel.quickActions || {});
  renderUpdates(viewModel.notifications || {});
}

export default {
  renderDashboard
};
