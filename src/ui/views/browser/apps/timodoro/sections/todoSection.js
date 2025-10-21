import { appendContent } from '../../../components/common/domHelpers.js';
import {
  buildTodoGrouping,
  TASK_GROUP_CONFIGS,
  DEFAULT_TODO_EMPTY_MESSAGE
} from '../../../../../actions/taskGrouping.js';
import { buildQueueEntryModel } from '../../../../../actions/models.js';
import { formatCurrency } from '../model.js';

const GROUP_ICONS = {
  hustle: '🚀',
  upgrade: '🛠️',
  study: '📚',
  other: '🌿'
};

const ACTION_LABELS = {
  hustle: 'Start Session',
  upgrade: 'Tune Stability',
  study: 'Refine',
  other: 'Support Flow'
};

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

function resolveActionLabel(groupKey, entry) {
  if (entry?.buttonLabel) {
    return entry.buttonLabel;
  }
  const fallback = ACTION_LABELS[groupKey];
  if (fallback) {
    return fallback;
  }
  return 'Ship It';
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
        name: normalized.title || normalized.label || normalized.name || `Task ${index + 1}`,
        detail: detailParts.join(' • '),
        groupKey: config.key,
        icon: GROUP_ICONS[config.key] || '🎯'
      };

      const hasHandler = typeof normalized.onClick === 'function';
      const requirementsMet = normalized.disabled !== true;
      if (hasHandler && requirementsMet) {
        item.action = {
          label: resolveActionLabel(config.key, normalized),
          onClick: normalized.onClick
        };
      }

      if (normalized.disabledReason) {
        item.disabledReason = normalized.disabledReason;
      }

      return item;
    });
    return map;
  }, {});

  const nextEntry = Array.isArray(grouping.entries) ? grouping.entries[0] : null;
  const nextEntryModel = nextEntry ? buildQueueEntryModel(nextEntry) : null;

  return {
    items: itemsByKey,
    grouping,
    nextEntry: nextEntryModel
  };
}

function createCelebrationLine(model = {}) {
  const totalWins = Math.max(0, Number(model.totalWins) || 0);
  if (totalWins === 0) {
    return null;
  }

  const celebration = document.createElement('p');
  celebration.className = 'timodoro-workspace__celebration';
  celebration.textContent = totalWins === 1
    ? 'Nice run — one focus block already in the books.'
    : `Nice run — ${totalWins} focus blocks already logged.`;

  return celebration;
}

function createFocusHero(entry = {}, options = {}) {
  const hero = document.createElement('section');
  hero.className = 'timodoro-focus-hero';

  const label = document.createElement('p');
  label.className = 'timodoro-focus-hero__label';
  label.textContent = entry.title ? 'Up next' : 'Line up your next session';

  const title = document.createElement('h3');
  title.className = 'timodoro-focus-hero__title';
  appendContent(title, entry.title || 'Queue a mission to get rolling.');

  const meta = document.createElement('p');
  meta.className = 'timodoro-focus-hero__meta';
  appendContent(meta, entry.meta || entry.durationText || 'Stack a task to spark momentum.');

  const actionRow = document.createElement('div');
  actionRow.className = 'timodoro-focus-hero__actions';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'timodoro-focus-hero__cta';
  const actionLabel = resolveActionLabel(entry.groupKey || 'hustle', entry);
  appendContent(cta, entry.buttonLabel || actionLabel);

  const hasClickHandler = typeof entry.onClick === 'function'
    ? true
    : typeof options.onStart === 'function';

  if (!hasClickHandler) {
    cta.disabled = true;
    cta.classList.add('timodoro-focus-hero__cta--disabled');
    cta.title = 'Queue a task to unlock your next sprint.';
  } else {
    cta.addEventListener('click', () => {
      if (cta.disabled) {
        return;
      }
      cta.disabled = true;
      cta.classList.add('is-busy');

      const handler = entry.onClick || options.onStart;
      const result = handler?.();
      if (!result || result.success !== true) {
        cta.disabled = false;
        cta.classList.remove('is-busy');
        return;
      }

      hero.classList.add('timodoro-focus-hero--completed');
      const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (fn => setTimeout(fn, 0));
      raf(() => {
        hero.classList.add('timodoro-focus-hero--celebrate');
      });
    });
  }

  actionRow.appendChild(cta);

  if (entry.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'timodoro-focus-hero__subtitle';
    appendContent(subtitle, entry.subtitle);
    actionRow.appendChild(subtitle);
  }

  hero.append(label, title, meta, actionRow);
  return hero;
}

function createFlowItem(entry = {}) {
  const item = document.createElement('article');
  item.className = 'timodoro-flow-item';

  const icon = document.createElement('span');
  icon.className = 'timodoro-flow-item__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = entry.icon || '🎯';

  const body = document.createElement('div');
  body.className = 'timodoro-flow-item__body';

  const name = document.createElement('h4');
  name.className = 'timodoro-flow-item__name';
  appendContent(name, entry.name || 'Queued focus');

  const detail = document.createElement('p');
  detail.className = 'timodoro-flow-item__detail';
  appendContent(detail, entry.detail || 'Ready when you are.');

  body.append(name, detail);
  item.append(icon, body);

  if (entry.action && typeof entry.action.onClick === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timodoro-flow-item__action';
    appendContent(button, entry.action.label || 'Start Session');

    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }
      button.disabled = true;
      button.classList.add('is-busy');
      const result = entry.action.onClick?.();
      if (!result || result.success !== true) {
        button.disabled = false;
        button.classList.remove('is-busy');
      }
    });

    item.appendChild(button);
  } else if (entry.disabledReason) {
    item.title = entry.disabledReason;
  }

  return item;
}

function createFlowGroup(config, items = [], emptyMessage) {
  const group = document.createElement('section');
  group.className = 'timodoro-flow__group';
  group.dataset.group = config.key;

  const header = document.createElement('header');
  header.className = 'timodoro-flow__group-header';

  const icon = document.createElement('span');
  icon.className = 'timodoro-flow__group-icon';
  icon.textContent = GROUP_ICONS[config.key] || '🎯';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'browser-visually-hidden';
  label.textContent = config.label;

  header.append(icon, label);
  group.appendChild(header);

  if (!items.length) {
    if (emptyMessage) {
      const empty = document.createElement('p');
      empty.className = 'timodoro-flow__empty';
      empty.textContent = emptyMessage;
      group.appendChild(empty);
    }
    return group;
  }

  const list = document.createElement('div');
  list.className = 'timodoro-flow__items';
  items.forEach(item => {
    const entry = createFlowItem(item);
    list.appendChild(entry);
  });
  group.appendChild(list);

  return group;
}

function createRecurringStack(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'timodoro-recurring';

  const title = document.createElement('h3');
  title.className = 'timodoro-recurring__title';
  title.textContent = 'Recurring rhythm';

  const list = document.createElement('ul');
  list.className = 'timodoro-recurring__list';

  entries.forEach(entry => {
    if (!entry) {
      return;
    }
    const item = document.createElement('li');
    item.className = 'timodoro-recurring__item';

    const name = document.createElement('span');
    name.className = 'timodoro-recurring__name';
    appendContent(name, entry.name || 'Recurring focus');

    const detail = document.createElement('span');
    detail.className = 'timodoro-recurring__detail';
    appendContent(detail, entry.detail || 'Logged earlier today.');

    item.append(name, detail);
    list.appendChild(item);
  });

  section.append(title, list);
  return section;
}

function createReflectionPrompt() {
  const prompt = document.createElement('section');
  prompt.className = 'timodoro-reflection';

  const label = document.createElement('h3');
  label.className = 'timodoro-reflection__title';
  label.textContent = 'End-of-day reflection';

  const copy = document.createElement('p');
  copy.className = 'timodoro-reflection__copy';
  copy.textContent = 'Drop a quick emoji or note about today’s vibe — future you will feel the echo.';

  prompt.append(label, copy);
  return prompt;
}

export function createFocusWorkspace(model = {}, options = {}) {
  const workspace = document.createElement('section');
  workspace.className = 'timodoro-workspace';

  const entries = Array.isArray(model.todoEntries) ? model.todoEntries : [];
  const todoGroups = options.todoGroups || buildTodoGroups(entries, {
    availableHours: model.todoHoursAvailable ?? model.hoursAvailable,
    availableMoney: model.todoMoneyAvailable ?? model.moneyAvailable,
    emptyMessage: model.todoEmptyMessage
  });

  const story = document.createElement('div');
  story.className = 'timodoro-workspace__story';

  if (todoGroups.nextEntry) {
    story.appendChild(createFocusHero(todoGroups.nextEntry, { onStart: options.onStart }));
  } else {
    story.appendChild(createFocusHero({}, { onStart: options.onStart }));
  }

  const celebration = createCelebrationLine(model);
  if (celebration) {
    story.appendChild(celebration);
  }

  const groupsWrapper = document.createElement('div');
  groupsWrapper.className = 'timodoro-flow';

  let populatedGroups = 0;
  TASK_GROUP_CONFIGS.forEach(config => {
    const items = todoGroups.items[config.key] || [];
    const emptyMessage = config.key === 'hustle'
      ? (todoGroups.grouping.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE)
      : config.empty;
    const group = createFlowGroup(config, items, emptyMessage);
    if (items.length > 0) {
      populatedGroups += 1;
    }
    groupsWrapper.appendChild(group);
  });

  if (populatedGroups === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'timodoro-flow__empty-all';
    emptyState.textContent = todoGroups.grouping.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE;
    groupsWrapper.appendChild(emptyState);
  }

  story.appendChild(groupsWrapper);

  const recurring = createRecurringStack(model.recurringEntries);
  if (recurring) {
    story.appendChild(recurring);
  }

  story.appendChild(createReflectionPrompt());

  workspace.appendChild(story);
  return { workspace, todoGroups };
}

export default {
  buildTodoGroups,
  createFocusWorkspace
};
