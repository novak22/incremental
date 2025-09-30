import {
  getAssetUpgradeActionsContainer,
  getDailyStats,
  getEventLogPreviewNode,
  getHeaderStats,
  getKpiNotes,
  getKpiValues,
  getMoneyNode,
  getNotificationsContainer,
  getQueueNodes,
  getQuickActionsContainer,
  getSessionStatusNode,
  getShellNavigation
} from '../../elements/registry.js';
import setText from '../../dom.js';

function createDailyListItem(entry) {
  if (!entry) return null;
  const li = document.createElement('li');
  li.className = 'daily-stats__item';
  const label = document.createElement('span');
  label.className = 'daily-stats__label';
  label.textContent = entry.label || 'Unknown';
  const value = document.createElement('span');
  value.className = 'daily-stats__value';
  value.textContent = entry.value || '';
  if (entry.definition?.name) {
    li.title = entry.definition.name;
  }
  if (entry.definition?.id) {
    li.dataset.metric = entry.definition.id;
  }
  li.append(label, value);
  return li;
}

function renderActionSection(container, entries, { emptyMessage, buttonClass, defaultLabel } = {}) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('action-list');

  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!list.length) {
    if (!emptyMessage) return;
    const empty = document.createElement('li');
    empty.className = 'action-list__empty';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'action-list__item';

    const content = document.createElement('div');
    content.className = 'action-list__content';

    const title = document.createElement('span');
    title.className = 'action-list__title';
    title.textContent = entry.title || '';
    content.appendChild(title);

    if (entry.subtitle) {
      const subtitle = document.createElement('span');
      subtitle.className = 'action-list__subtitle';
      subtitle.textContent = entry.subtitle;
      content.appendChild(subtitle);
    }

    if (entry.meta) {
      const meta = document.createElement('span');
      const metaClasses = ['action-list__meta'];
      if (entry.metaClass) {
        metaClasses.push(entry.metaClass);
      }
      meta.className = metaClasses.join(' ');
      meta.textContent = entry.meta;
      content.appendChild(meta);
    }

    const actions = document.createElement('div');
    actions.className = 'action-list__actions';

    const button = document.createElement('button');
    button.type = 'button';
    const buttonClasses = ['action-list__button'];
    if (buttonClass) {
      buttonClasses.push(...String(buttonClass).split(' ').filter(Boolean));
    } else {
      buttonClasses.push('primary');
    }
    button.className = buttonClasses.join(' ');
    button.textContent = entry.buttonLabel || defaultLabel || 'Select';
    if (typeof entry.onClick === 'function') {
      button.addEventListener('click', () => entry.onClick?.());
    }

    actions.appendChild(button);

    item.append(content, actions);
    container.appendChild(item);
  });
}

function renderDailyList(container, entries, emptyMessage, limit = 3) {
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!list.length) {
    if (!emptyMessage) return;
    const empty = document.createElement('li');
    empty.className = 'daily-stats__empty';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.slice(0, limit).forEach(entry => {
    const item = createDailyListItem(entry);
    if (item) {
      container.appendChild(item);
    }
  });
}

function renderQueueSection(queue = {}) {
  const container = getQueueNodes()?.actionQueue;
  if (!container) return;
  container.innerHTML = '';
  const items = Array.isArray(queue.items) ? queue.items : [];
  items.forEach(item => {
    if (!item) return;
    const li = document.createElement('li');
    if (item.state) {
      li.dataset.state = item.state;
    }
    const label = document.createElement('div');
    label.className = 'queue__meta';
    const title = document.createElement('strong');
    title.textContent = item.label || '';
    label.appendChild(title);
    if (item.detail) {
      const detail = document.createElement('span');
      detail.className = 'queue__detail';
      detail.textContent = item.detail;
      label.appendChild(detail);
    }
    const hours = document.createElement('span');
    hours.className = 'queue__hours';
    hours.textContent = item.hoursLabel || '';
    li.append(label, hours);
    container.appendChild(li);
  });
}

function renderQuickActionsSection(quickActions = {}) {
  const container = getQuickActionsContainer();
  const entries = Array.isArray(quickActions.entries) ? quickActions.entries : [];
  renderActionSection(container, entries, {
    emptyMessage: quickActions.emptyMessage,
    buttonClass: quickActions.buttonClass,
    defaultLabel: quickActions.defaultLabel
  });
}

function renderAssetActionsSection(assetActions = {}) {
  const container = getAssetUpgradeActionsContainer();
  const entries = Array.isArray(assetActions.entries) ? assetActions.entries : [];
  renderActionSection(container, entries, {
    emptyMessage: assetActions.emptyMessage,
    buttonClass: assetActions.buttonClass,
    defaultLabel: assetActions.defaultLabel
  });
}

function resolveNotificationAction(entry) {
  if (!entry?.action) return null;
  if (entry.action.type === 'shell-tab') {
    const tabId = entry.action.tabId;
    return () => {
      const { shellTabs = [] } = getShellNavigation() || {};
      shellTabs.find(tab => tab.id === tabId)?.click();
    };
  }
  if (typeof entry.action === 'function') {
    return () => entry.action();
  }
  return null;
}

function renderNotificationsSection(notifications = {}) {
  const container = getNotificationsContainer();
  if (!container) return;
  container.innerHTML = '';
  const entries = Array.isArray(notifications.entries) ? notifications.entries : [];
  if (!entries.length) {
    if (!notifications.emptyMessage) return;
    const empty = document.createElement('li');
    empty.textContent = notifications.emptyMessage;
    container.appendChild(empty);
    return;
  }

  entries.slice(0, 4).forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'notifications__info';
    const title = document.createElement('span');
    title.textContent = entry.label || '';
    const message = document.createElement('span');
    message.textContent = entry.message || '';
    message.className = 'notifications__message';
    info.append(title, message);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.textContent = 'Open';
    const handler = resolveNotificationAction(entry);
    if (handler) {
      button.addEventListener('click', handler);
    } else {
      button.disabled = true;
    }
    item.append(info, button);
    container.appendChild(item);
  });
}

function renderEventLogSection(eventLog = {}) {
  const container = getEventLogPreviewNode();
  if (!container) return;
  container.innerHTML = '';
  const entries = Array.isArray(eventLog.entries) ? eventLog.entries : [];
  if (!entries.length) {
    if (!eventLog.emptyMessage) return;
    const empty = document.createElement('p');
    empty.textContent = eventLog.emptyMessage;
    container.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    if (!entry) return;
    const block = document.createElement('article');
    block.className = 'event-preview__item';
    const time = document.createElement('span');
    time.className = 'event-preview__time';
    time.textContent = entry.timeLabel || '';
    const message = document.createElement('p');
    message.className = 'event-preview__message';
    message.textContent = entry.message || '';
    block.append(time, message);
    container.appendChild(block);
  });
}

function renderDailyStatsSection(dailyStats = {}) {
  const refs = getDailyStats() || {};
  if (!refs) return;

  if (dailyStats.time) {
    setText(refs.timeSummary, dailyStats.time.summary || '');
    renderDailyList(refs.timeList, dailyStats.time.entries, dailyStats.time.emptyMessage, dailyStats.time.limit);
  }

  if (dailyStats.earnings) {
    setText(refs.earningsSummary, dailyStats.earnings.summary || '');
    renderDailyList(refs.earningsActive, dailyStats.earnings.active?.entries, dailyStats.earnings.active?.emptyMessage, dailyStats.earnings.active?.limit);
    renderDailyList(refs.earningsPassive, dailyStats.earnings.passive?.entries, dailyStats.earnings.passive?.emptyMessage, dailyStats.earnings.passive?.limit);
  }

  if (dailyStats.spend) {
    setText(refs.spendSummary, dailyStats.spend.summary || '');
    renderDailyList(refs.spendList, dailyStats.spend.entries, dailyStats.spend.emptyMessage, dailyStats.spend.limit);
  }

  if (dailyStats.study) {
    setText(refs.studySummary, dailyStats.study.summary || '');
    renderDailyList(refs.studyList, dailyStats.study.entries, dailyStats.study.emptyMessage, dailyStats.study.limit);
  }
}

function applyHeaderMetrics(headerMetrics = {}) {
  const refs = getHeaderStats() || {};
  const sections = ['dailyPlus', 'dailyMinus', 'timeAvailable', 'timeReserved'];
  sections.forEach(key => {
    const target = headerMetrics[key];
    const ref = refs[key] || {};
    setText(ref.value, target?.value || '');
    setText(ref.note, target?.note || '');
  });
}

function applyKpiStats(kpis = {}) {
  const values = getKpiValues() || {};
  const notes = getKpiNotes() || {};
  const entries = ['net', 'hours', 'upkeep', 'ventures', 'study'];
  entries.forEach(key => {
    const target = kpis[key];
    setText(values[key], target?.value || '');
    setText(notes[key], target?.note || '');
  });
}

function renderSession(session = {}) {
  const sessionStatus = getSessionStatusNode();
  setText(sessionStatus, session.statusText || '');
  setText(getMoneyNode(), session.moneyText || '');
}

function renderDashboard(viewModel = {}) {
  if (!viewModel) return;
  renderSession(viewModel.session);
  applyHeaderMetrics(viewModel.headerMetrics);
  applyKpiStats(viewModel.kpis);
  renderQueueSection(viewModel.queue);
  renderQuickActionsSection(viewModel.quickActions);
  renderAssetActionsSection(viewModel.assetActions);
  renderNotificationsSection(viewModel.notifications);
  renderEventLogSection(viewModel.eventLog);
  renderDailyStatsSection(viewModel.dailyStats);
}

export default {
  renderDashboard
};
