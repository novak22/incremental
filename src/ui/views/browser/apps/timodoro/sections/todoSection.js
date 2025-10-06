import { appendContent } from '../../../components/common/domHelpers.js';
import {
  buildTodoGrouping,
  TASK_GROUP_CONFIGS,
  DEFAULT_TODO_EMPTY_MESSAGE
} from '../../../../../actions/taskGrouping.js';
import { buildQueueEntryModel } from '../../../../../actions/models.js';
import { createCard } from '../components/card.js';
import { createTaskList } from '../components/lists.js';
import { formatCurrency } from '../model.js';

function appendDetail(parts, value) {
  if (!value) {
    return;
  }
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return;
  }
  if (parts.includes(normalized)) {
    return;
  }
  parts.push(normalized);
}

export function buildTodoGroups(entries = [], options = {}) {
  const grouping = buildTodoGrouping(entries, options);
  const groupedEntries = grouping.groups || {};
  const itemsByKey = TASK_GROUP_CONFIGS.reduce((map, config) => {
    const bucketEntries = (groupedEntries[config.key] || []).filter(Boolean);
    map[config.key] = bucketEntries.map((entry, index) => {
      const normalized = buildQueueEntryModel(entry) || {};
      const detailParts = [];
      if (normalized.payoutText && config.key !== 'upgrade') {
        appendDetail(detailParts, normalized.payoutText);
      }
      appendDetail(detailParts, normalized.durationText);
      if (normalized.meta && config.key !== 'upgrade') {
        appendDetail(detailParts, normalized.meta);
      }
      const moneyCost = Number(normalized.moneyCost);
      if (Number.isFinite(moneyCost) && Math.abs(moneyCost) > 1e-4) {
        appendDetail(detailParts, `Cost ${formatCurrency(Math.abs(moneyCost))}`);
      }
      const runsRemaining = Number(normalized.remainingRuns ?? normalized.upgradeRemaining);
      if (Number.isFinite(runsRemaining) && runsRemaining > 0) {
        appendDetail(detailParts, `Runs left ×${runsRemaining}`);
      }

      const item = {
        name: normalized.title || normalized.label || normalized.name || `Task ${index + 1}`
      };

      if (config.key !== 'study' && detailParts.length > 0) {
        item.detail = detailParts.join(' • ');
      }

      return item;
    });
    return map;
  }, {});

  return {
    items: itemsByKey,
    grouping
  };
}

export function createTodoCard(model = {}, options = {}) {
  const { navigation } = options;
  const card = createCard({
    title: 'ToDo',
    headerClass: navigation ? 'browser-card__header--stacked' : undefined,
    headerContent: navigation || null
  });

  const entries = Array.isArray(model.todoEntries) ? model.todoEntries : [];
  const { items: groupedItems, grouping } = buildTodoGroups(entries, {
    availableHours: model.todoHoursAvailable ?? model.hoursAvailable,
    availableMoney: model.todoMoneyAvailable ?? model.moneyAvailable,
    emptyMessage: model.todoEmptyMessage
  });

  if (grouping.totalPending === 0) {
    const emptyText = grouping.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE;
    card.appendChild(createTaskList([], emptyText, 'timodoro-todo'));
    return card;
  }

  const section = document.createElement('section');
  section.className = 'timodoro-section';

  const heading = document.createElement('h3');
  heading.className = 'timodoro-section__title';
  appendContent(heading, 'Up next');
  section.appendChild(heading);

  const groupsWrapper = document.createElement('div');
  groupsWrapper.className = 'timodoro-section__groups';

  TASK_GROUP_CONFIGS.forEach(config => {
    const group = document.createElement('section');
    group.className = 'timodoro-subsection';

    const title = document.createElement('h4');
    title.className = 'timodoro-subsection__title';
    appendContent(title, config.label);

    const items = groupedItems[config.key] || [];
    const emptyMessage = config.key === 'hustle'
      ? (grouping.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE)
      : config.empty;
    const list = createTaskList(items, emptyMessage, `timodoro-todo-${config.key}`);

    group.append(title, list);
    groupsWrapper.appendChild(group);
  });

  section.appendChild(groupsWrapper);
  card.appendChild(section);

  return card;
}
