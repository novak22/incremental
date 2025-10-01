import { getElement } from '../../elements/registry.js';
import { formatHours } from '../../../core/helpers.js';
import todoWidget from './widgets/todoWidget.js';
import appsWidget from './widgets/appsWidget.js';
import bankWidget from './widgets/bankWidget.js';

const widgetModules = {
  todo: todoWidget,
  apps: appsWidget,
  bank: bankWidget
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createUpgradeTodoEntries(entries = []) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  return list.map((entry, index) => {
    const hours = Math.max(0, toNumber(entry?.durationHours, toNumber(entry?.timeCost)));
    const durationText = entry?.durationText || formatHours(hours);
    const metaParts = [entry?.subtitle, entry?.meta].filter(Boolean);
    return {
      id: entry?.id || `upgrade-${index}`,
      title: entry?.title || 'Upgrade',
      meta: metaParts.join(' • '),
      onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
      durationHours: hours,
      durationText,
      repeatable: Boolean(entry?.repeatable),
      remainingRuns: entry?.remainingRuns ?? null
    };
  });
}

function composeTodoModel(quickActions = {}, assetActions = {}) {
  const quickEntries = Array.isArray(quickActions?.entries)
    ? quickActions.entries.filter(Boolean)
    : [];
  const upgradeEntries = createUpgradeTodoEntries(assetActions?.entries);
  const entries = [...quickEntries, ...upgradeEntries];

  const model = { ...(quickActions || {}) };
  model.entries = entries;
  model.emptyMessage = quickActions?.emptyMessage
    || assetActions?.emptyMessage
    || 'Queue a hustle or upgrade to add new tasks.';

  if (model.hoursAvailable == null && assetActions?.hoursAvailable != null) {
    model.hoursAvailable = assetActions.hoursAvailable;
  }
  if (model.hoursSpent == null && assetActions?.hoursSpent != null) {
    model.hoursSpent = assetActions.hoursSpent;
  }
  if (!model.hoursAvailableLabel && model.hoursAvailable != null) {
    const available = toNumber(model.hoursAvailable);
    model.hoursAvailableLabel = formatHours(Math.max(0, available));
  }
  if (!model.hoursSpentLabel && model.hoursSpent != null) {
    const spent = toNumber(model.hoursSpent);
    model.hoursSpentLabel = formatHours(Math.max(0, spent));
  }

  return model;
}

function getWidgetMounts() {
  return getElement('homepageWidgets') || {};
}

function ensureWidget(key) {
  const module = widgetModules[key];
  if (!module) return null;
  const mounts = getWidgetMounts();
  const target = mounts[key];
  if (!target) return null;
  if (typeof module.init === 'function') {
    module.init(target);
  }
  return module;
}

function renderTodo(quickActions = {}, assetActions = {}) {
  const widget = ensureWidget('todo');
  if (!widget) return;
  const model = composeTodoModel(quickActions, assetActions);
  widget.render(model);
}

function renderApps(context = {}) {
  const widget = ensureWidget('apps');
  widget?.render(context);
}

function renderBank(context = {}) {
  const widget = ensureWidget('bank');
  widget?.render(context);
}

function renderDashboard(viewModel = {}, context = {}) {
  if (!viewModel) return;
  renderTodo(viewModel.quickActions || {}, viewModel.assetActions || {});
  renderApps(context);
  renderBank(context);
}

export default {
  renderDashboard
};
