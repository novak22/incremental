import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { getState } from '../../../../../core/state.js';
import { getPageByType } from '../pageLookup.js';
import { formatRoi } from '../../components/widgets.js';
import { createOfferList } from './offers.js';
import { createCommitmentList } from './commitments.js';
import {
  ASSISTANT_CONFIG,
  getAssistantCount,
  getAssistantDailyCost,
  canHireAssistant,
  hireAssistant,
  canFireAssistant,
  fireAssistant
} from '../../../../../game/assistant.js';

const CATEGORY_ORDER = ['writing', 'community', 'research', 'ops'];

const CATEGORY_CONFIG = {
  writing: { id: 'freelance', label: 'Freelance Grind', icon: '✍️' },
  community: { id: 'audience', label: 'Creator Lane', icon: '📣' },
  research: { id: 'survey', label: 'Quick Cash', icon: '🧪' },
  ops: { id: 'data-entry', label: 'Ops Desk', icon: '🗂️' }
};

const DEFAULT_CATEGORY_CONFIG = { id: 'hustle', label: 'Daily Hustles', icon: '💼' };

const QUICK_FILTERS = [
  { id: 'highPayout', label: '💰 High payout' },
  { id: 'shortTasks', label: '⚡ Short tasks' },
  { id: 'skillXp', label: '🧠 Skill XP' },
  { id: 'expiringSoon', label: '🕒 Expiring soon' }
];

const QUICK_FILTER_ORDER = new Map(QUICK_FILTERS.map((filter, index) => [filter.id, index]));

const APP_VIEWS = [
  { id: 'gigs', label: 'Find gigs', icon: '🗂️' },
  { id: 'hire', label: 'Hire people', icon: '🤝' }
];

const boardStateMap = new WeakMap();
const appStateMap = new WeakMap();

function normalizeFilterIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function ensureDownworkSessionConfig() {
  const state = getState();
  if (!state || typeof state !== 'object') {
    return null;
  }

  if (!state.session || typeof state.session !== 'object') {
    state.session = {};
  }

  if (!state.session.config || typeof state.session.config !== 'object') {
    state.session.config = {};
  }

  const config = state.session.config;
  if (!config.downwork || typeof config.downwork !== 'object') {
    config.downwork = {};
  }

  const downwork = config.downwork;
  if (!Array.isArray(downwork.quickFilters)) {
    downwork.quickFilters = [];
  }
  if (!Array.isArray(downwork.categoryFilters)) {
    downwork.categoryFilters = [];
  }
  if (downwork.activeCategory != null && typeof downwork.activeCategory !== 'string') {
    downwork.activeCategory = null;
  }

  return downwork;
}

function getAppState(app) {
  if (!appStateMap.has(app)) {
    appStateMap.set(app, {
      activeView: 'gigs',
      buttons: new Map(),
      panels: new Map(),
      metaElements: new Map()
    });
  }
  return appStateMap.get(app);
}

function updateTabMeta(state, viewId, text) {
  if (!state) return;
  const meta = state.metaElements.get(viewId);
  if (!meta) return;
  const normalized = String(text || '').trim();
  if (normalized) {
    meta.textContent = normalized;
    meta.hidden = false;
  } else {
    meta.textContent = '';
    meta.hidden = true;
  }
}

function setActiveView(app, viewId) {
  if (!app) return;
  const state = getAppState(app);
  let targetId = viewId;
  if (!state.panels.has(targetId)) {
    if (state.panels.has(state.activeView)) {
      targetId = state.activeView;
    } else if (state.panels.size > 0) {
      targetId = state.panels.keys().next().value;
    } else {
      targetId = 'gigs';
    }
  }
  state.activeView = targetId;
  state.buttons.forEach((button, id) => {
    if (!button) return;
    const isActive = id === state.activeView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  state.panels.forEach((panel, id) => {
    if (!panel) return;
    const isActive = id === state.activeView;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
  app.dataset.activeView = state.activeView;
}

function ensureDownworkApp(body) {
  if (!body) return null;
  let app = body.querySelector('[data-role="downwork-app"]');
  let nav = null;
  let content = null;

  if (!app) {
    app = document.createElement('div');
    app.className = 'downwork-app';
    app.dataset.role = 'downwork-app';

    nav = document.createElement('div');
    nav.className = 'downwork-app__nav';
    nav.dataset.role = 'downwork-nav';

    content = document.createElement('div');
    content.className = 'downwork-app__content';

    app.append(nav, content);
    body.appendChild(app);
  } else {
    nav = app.querySelector('[data-role="downwork-nav"]');
    content = app.querySelector('.downwork-app__content');
  }

  const state = getAppState(app);

  APP_VIEWS.forEach(view => {
    if (!state.buttons.has(view.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'downwork-app__tab';
      button.dataset.view = view.id;
      button.setAttribute('aria-pressed', 'false');

      if (view.icon) {
        const icon = document.createElement('span');
        icon.className = 'downwork-app__tab-icon';
        icon.textContent = view.icon;
        button.appendChild(icon);
      }

      const label = document.createElement('span');
      label.className = 'downwork-app__tab-label';
      label.textContent = view.label;
      button.appendChild(label);

      const meta = document.createElement('span');
      meta.className = 'downwork-app__tab-meta';
      meta.hidden = true;
      button.appendChild(meta);

      button.addEventListener('click', () => {
        setActiveView(app, view.id);
      });

      nav?.appendChild(button);
      state.buttons.set(view.id, button);
      state.metaElements.set(view.id, meta);
    }

    if (!state.panels.has(view.id)) {
      const panel = document.createElement('div');
      panel.className = `downwork-panel downwork-panel--${view.id}`;
      panel.dataset.view = view.id;
      panel.hidden = view.id !== state.activeView;
      panel.classList.toggle('is-active', view.id === state.activeView);
      content?.appendChild(panel);
      state.panels.set(view.id, panel);
    } else {
      const panel = state.panels.get(view.id);
      if (panel && !panel.isConnected) {
        content?.appendChild(panel);
      }
    }
  });

  setActiveView(app, state.activeView);

  return {
    app,
    nav,
    boardPanel: state.panels.get('gigs') || null,
    hirePanel: state.panels.get('hire') || null,
    state
  };
}

function resolveCategoryKey(value = '') {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  return trimmed || '';
}

function resolveCategoryConfig(key = '') {
  const normalized = resolveCategoryKey(key);
  return CATEGORY_CONFIG[normalized] || DEFAULT_CATEGORY_CONFIG;
}

function getCategorySortIndex(key = '') {
  const normalized = resolveCategoryKey(key);
  const index = CATEGORY_ORDER.indexOf(normalized);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function formatTagLabel(raw = '') {
  if (!raw) return '';
  return raw
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function resolveTagEntries(model = {}, definition = {}) {
  const sources = [];
  if (Array.isArray(model.tags)) sources.push(...model.tags);
  if (Array.isArray(definition.tags)) sources.push(...definition.tags);

  const unique = new Map();

  sources.forEach(entry => {
    if (!entry) return;
    let id = '';
    let label = '';

    if (typeof entry === 'string') {
      id = entry.trim().toLowerCase().replace(/\s+/g, '-');
      label = formatTagLabel(entry);
    } else if (typeof entry === 'object') {
      const rawId = typeof entry.id === 'string' && entry.id.trim().length > 0
        ? entry.id.trim()
        : typeof entry.value === 'string' && entry.value.trim().length > 0
          ? entry.value.trim()
          : typeof entry.label === 'string'
            ? entry.label.trim()
            : '';
      id = rawId.toLowerCase().replace(/\s+/g, '-');
      const rawLabel = typeof entry.label === 'string' && entry.label.trim().length > 0
        ? entry.label.trim()
        : rawId;
      label = formatTagLabel(rawLabel);
    }

    if (!id) return;
    if (!label) {
      label = formatTagLabel(id);
    }

    if (!unique.has(id)) {
      unique.set(id, label);
    }
  });

  return Array.from(unique.entries()).map(([id, label]) => ({ id, label }));
}

function createFilterRow(labelText = '') {
  const row = document.createElement('div');
  row.className = 'downwork-filter-row';

  if (labelText) {
    const label = document.createElement('span');
    label.className = 'downwork-filter-row__label';
    label.textContent = labelText;
    row.appendChild(label);
  }

  const chips = document.createElement('div');
  chips.className = 'downwork-filter-row__chips';
  row.appendChild(chips);

  return { row, chips };
}

function getBoardState(board) {
  if (!boardStateMap.has(board)) {
    boardStateMap.set(board, {
      activeCategory: null,
      activeFilters: new Set(),
      activeCategoryFilters: new Set(),
      summary: {
        focusHours: 0,
        acceptedCount: 0,
        potentialPayout: 0
      },
      elements: {},
      availableCategoryFilters: new Map(),
      thresholds: {
        payoutHigh: 0,
        shortTask: 0,
        expiringSoon: Infinity
      },
      toastTimeout: null
    });
  }
  return boardStateMap.get(board);
}

function createSummaryStat(label, { valueRole, deltaRole }) {
  const stat = document.createElement('div');
  stat.className = 'downwork-summary__stat';

  const labelEl = document.createElement('span');
  labelEl.className = 'downwork-summary__label';
  labelEl.textContent = label;
  stat.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'downwork-summary__value';
  if (valueRole) {
    valueEl.dataset.role = valueRole;
  }
  valueEl.textContent = '—';
  stat.appendChild(valueEl);

  if (deltaRole) {
    const deltaEl = document.createElement('span');
    deltaEl.className = 'downwork-summary__delta';
    deltaEl.dataset.role = deltaRole;
    deltaEl.hidden = true;
    stat.appendChild(deltaEl);
  }

  return stat;
}

function ensureBoard(body) {
  if (!body) return null;
  let board = body.querySelector('[data-role="downwork-board"]');
  if (board) {
    return board;
  }

  board = document.createElement('div');
  board.className = 'downwork-board';
  board.dataset.role = 'downwork-board';

  const summary = document.createElement('header');
  summary.className = 'downwork-board__summary';
  summary.dataset.role = 'downwork-summary';
  summary.append(
    createSummaryStat('Focus hours left', {
      valueRole: 'downwork-focus-value',
      deltaRole: 'downwork-focus-delta'
    }),
    createSummaryStat('Accepted gigs', {
      valueRole: 'downwork-accepted-value',
      deltaRole: 'downwork-accepted-delta'
    }),
    createSummaryStat('Potential payout', {
      valueRole: 'downwork-payout-value',
      deltaRole: 'downwork-payout-delta'
    })
  );

  const tabs = document.createElement('div');
  tabs.className = 'downwork-board__tabs';
  tabs.dataset.role = 'downwork-tabs';

  const filters = document.createElement('div');
  filters.className = 'downwork-board__filters';
  filters.dataset.role = 'downwork-filters';

  const grid = document.createElement('div');
  grid.className = 'downwork-board__list';
  grid.dataset.role = 'browser-hustle-list';

  const toastHost = document.createElement('div');
  toastHost.className = 'downwork-board__toasts';
  toastHost.dataset.role = 'downwork-toast-host';

  board.append(summary, tabs, filters, grid, toastHost);
  body.appendChild(board);
  return board;
}

function formatHoursLabel(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return formatHours(Math.max(0, value));
}

function formatPayoutLabel(value) {
  if (!Number.isFinite(value)) {
    return '$0';
  }
  const safeValue = Math.max(0, value);
  return `$${formatMoney(safeValue)}`;
}

function describeBoardNavSummary({ availableCount = 0, upcomingCount = 0, commitmentCount = 0 } = {}) {
  const parts = [];
  if (availableCount > 0) {
    parts.push(`${availableCount} ready`);
  }
  if (commitmentCount > 0) {
    parts.push(`${commitmentCount} active`);
  }
  if (!parts.length && upcomingCount > 0) {
    parts.push(`${upcomingCount} queued`);
  }
  return parts.join(' • ');
}

function describeHireNavSummary() {
  const count = Math.max(0, Number(getAssistantCount()) || 0);
  const maxAssistants = Math.max(0, Number(ASSISTANT_CONFIG.maxAssistants) || 0);
  if (maxAssistants > 0) {
    if (count >= maxAssistants) {
      return `Team full (${count}/${maxAssistants})`;
    }
    if (count > 0) {
      return `${count}/${maxAssistants} on staff`;
    }
    return `${maxAssistants} slots open`;
  }
  if (count > 0) {
    return `${count} on staff`;
  }
  const hoursPerAssistant = Math.max(0, Number(ASSISTANT_CONFIG.hoursPerAssistant) || 0);
  if (hoursPerAssistant > 0) {
    return `+${formatHours(hoursPerAssistant)}/day ready`;
  }
  return '';
}

function createHireStat(label, value) {
  const stat = document.createElement('div');
  stat.className = 'downwork-hiring-card__stat';

  const labelEl = document.createElement('span');
  labelEl.className = 'downwork-hiring-card__stat-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'downwork-hiring-card__stat-value';
  valueEl.textContent = value;

  stat.append(labelEl, valueEl);
  return stat;
}

function createBenefitItem(text) {
  const item = document.createElement('li');
  item.className = 'downwork-hiring-card__benefit';
  item.textContent = text;
  return item;
}

function renderHirePanel(panel, { onStateChange } = {}) {
  if (!panel) return;

  const assistantCount = Math.max(0, Number(getAssistantCount()) || 0);
  const maxAssistants = Math.max(0, Number(ASSISTANT_CONFIG.maxAssistants) || 0);
  const hoursPerAssistant = Math.max(0, Number(ASSISTANT_CONFIG.hoursPerAssistant) || 0);
  const hourlyRate = Math.max(0, Number(ASSISTANT_CONFIG.hourlyRate) || 0);
  const hiringCost = Math.max(0, Number(ASSISTANT_CONFIG.hiringCost) || 0);
  const totalHours = Math.max(0, assistantCount * hoursPerAssistant);
  const dailyCost = Math.max(0, Number(getAssistantDailyCost()) || 0);
  const hourlyTeamCost = Math.max(0, hourlyRate * assistantCount);
  const slotsRemaining = maxAssistants > 0 ? Math.max(0, maxAssistants - assistantCount) : 0;

  panel.innerHTML = '';

  const refresh = () => {
    renderHirePanel(panel, { onStateChange });
    onStateChange?.();
  };

  const layout = document.createElement('div');
  layout.className = 'downwork-hiring';
  panel.appendChild(layout);

  const teamSection = document.createElement('section');
  teamSection.className = 'downwork-hiring__section';
  layout.appendChild(teamSection);

  const teamHeading = document.createElement('h2');
  teamHeading.className = 'downwork-hiring__title';
  teamHeading.textContent = 'Team roster';
  teamSection.appendChild(teamHeading);

  const teamCard = document.createElement('article');
  teamCard.className = 'browser-card browser-card--action downwork-hiring-card';
  teamSection.appendChild(teamCard);

  const teamHeader = document.createElement('header');
  teamHeader.className = 'browser-card__header downwork-hiring-card__header';
  teamCard.appendChild(teamHeader);

  const teamIcon = document.createElement('span');
  teamIcon.className = 'downwork-hiring-card__icon';
  teamIcon.textContent = '🤖';
  teamHeader.appendChild(teamIcon);

  const teamTitle = document.createElement('h3');
  teamTitle.className = 'browser-card__title';
  teamTitle.textContent = 'Virtual assistant crew';
  teamHeader.appendChild(teamTitle);

  const teamSummary = document.createElement('p');
  teamSummary.className = 'browser-card__summary downwork-hiring-card__summary';
  teamSummary.textContent =
    assistantCount > 0
      ? `Your crew covers ${formatHours(totalHours)} of upkeep every day.`
      : `No assistants yet — hire one to add +${formatHours(hoursPerAssistant)} daily focus hours.`;
  teamCard.appendChild(teamSummary);

  const stats = document.createElement('div');
  stats.className = 'downwork-hiring-card__stats';
  stats.append(
    createHireStat('Team size', maxAssistants > 0 ? `${assistantCount} / ${maxAssistants}` : String(assistantCount)),
    createHireStat(
      'Focus coverage',
      assistantCount > 0 ? `${formatHours(totalHours)} per day` : '0h per day'
    ),
    createHireStat(
      'Payroll',
      assistantCount > 0
        ? `$${formatMoney(dailyCost)} daily • $${formatMoney(hourlyTeamCost)}/hr`
        : `$${formatMoney(hourlyRate)}/hr teammate`
    )
  );
  teamCard.appendChild(stats);

  const teamActions = document.createElement('div');
  teamActions.className = 'browser-card__actions downwork-hiring-card__actions';
  teamCard.appendChild(teamActions);

  const fireButton = document.createElement('button');
  fireButton.type = 'button';
  fireButton.className = 'browser-card__button downwork-hiring-card__button';
  if (assistantCount > 1) {
    fireButton.textContent = 'Let one go';
  } else if (assistantCount === 1) {
    fireButton.textContent = 'Let assistant go';
  } else {
    fireButton.textContent = 'No assistants to release';
  }
  fireButton.disabled = !canFireAssistant();
  fireButton.addEventListener('click', () => {
    fireAssistant();
    refresh();
  });
  teamActions.appendChild(fireButton);

  const capacityNote = document.createElement('p');
  capacityNote.className = 'downwork-hiring-card__meta';
  if (maxAssistants > 0) {
    capacityNote.textContent =
      slotsRemaining > 0
        ? `${slotsRemaining} open slot${slotsRemaining === 1 ? '' : 's'} remain.`
        : 'Team is at full capacity.';
  } else {
    capacityNote.textContent = 'Team size currently has no cap.';
  }
  teamCard.appendChild(capacityNote);

  const talentSection = document.createElement('section');
  talentSection.className = 'downwork-hiring__section';
  layout.appendChild(talentSection);

  const talentHeading = document.createElement('h2');
  talentHeading.className = 'downwork-hiring__title';
  talentHeading.textContent = 'Available talent';
  talentSection.appendChild(talentHeading);

  const talentCard = document.createElement('article');
  talentCard.className = 'browser-card browser-card--action downwork-hiring-card';
  talentSection.appendChild(talentCard);

  const talentHeader = document.createElement('header');
  talentHeader.className = 'browser-card__header downwork-hiring-card__header';
  talentCard.appendChild(talentHeader);

  const talentIcon = document.createElement('span');
  talentIcon.className = 'downwork-hiring-card__icon';
  talentIcon.textContent = '🧰';
  talentHeader.appendChild(talentIcon);

  const talentTitle = document.createElement('h3');
  talentTitle.className = 'browser-card__title';
  talentTitle.textContent = 'Virtual Assistant';
  talentHeader.appendChild(talentTitle);

  const talentSummary = document.createElement('p');
  talentSummary.className = 'browser-card__summary downwork-hiring-card__summary';
  talentSummary.textContent =
    'Onboard cheerful ops support to manage inboxes, schedules, and research sprints.';
  talentCard.appendChild(talentSummary);

  const benefits = document.createElement('ul');
  benefits.className = 'downwork-hiring-card__benefits';
  benefits.append(
    createBenefitItem(`+${formatHours(hoursPerAssistant)} focus hours covered each day`),
    createBenefitItem(`$${formatMoney(hourlyRate)}/hr ongoing payroll`),
    createBenefitItem(`$${formatMoney(hiringCost)} onboarding cost`)
  );
  talentCard.appendChild(benefits);

  const hireActions = document.createElement('div');
  hireActions.className = 'browser-card__actions downwork-hiring-card__actions';
  talentCard.appendChild(hireActions);

  const hireButton = document.createElement('button');
  hireButton.type = 'button';
  hireButton.className = 'browser-card__button browser-card__button--primary downwork-hiring-card__button';
  hireButton.textContent = `Hire for $${formatMoney(hiringCost)}`;
  hireButton.disabled = !canHireAssistant();
  hireButton.addEventListener('click', () => {
    hireAssistant();
    refresh();
  });
  hireActions.appendChild(hireButton);

  const hireMeta = document.createElement('p');
  hireMeta.className = 'downwork-hiring-card__meta';
  if (maxAssistants > 0) {
    hireMeta.textContent =
      slotsRemaining > 0
        ? `${slotsRemaining} of ${maxAssistants} slots open.`
        : 'Team is full — release someone to hire again.';
  } else {
    hireMeta.textContent = 'Hire as budget allows — no cap listed yet.';
  }
  talentCard.appendChild(hireMeta);
}

function updateDeltaElement(element, value, formatter = value => String(value)) {
  if (!element) return;
  if (!value) {
    element.hidden = true;
    element.textContent = '';
    element.classList.remove('is-positive', 'is-negative');
    return;
  }
  const isPositive = value > 0;
  const magnitude = Math.abs(value);
  const formatted = formatter(magnitude);
  const prefix = isPositive ? '+' : '−';
  element.textContent = `${prefix}${formatted}`;
  element.hidden = false;
  element.classList.toggle('is-positive', isPositive);
  element.classList.toggle('is-negative', !isPositive);
  element.classList.add('is-visible');
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      element.classList.remove('is-visible');
    });
  } else {
    element.classList.remove('is-visible');
  }
}

function updateSummaryDisplay(boardState, summary, deltas = {}) {
  boardState.summary = {
    focusHours: summary.focusHours,
    acceptedCount: summary.acceptedCount,
    potentialPayout: summary.potentialPayout
  };

  const {
    focusValue,
    focusDelta,
    acceptedValue,
    acceptedDelta,
    payoutValue,
    payoutDelta
  } = boardState.elements;

  if (focusValue) {
    focusValue.textContent = formatHoursLabel(summary.focusHours);
  }
  if (acceptedValue) {
    acceptedValue.textContent = String(Math.max(0, summary.acceptedCount));
  }
  if (payoutValue) {
    payoutValue.textContent = formatPayoutLabel(summary.potentialPayout);
  }

  updateDeltaElement(focusDelta, deltas.focusHoursDelta, value => formatHours(Math.max(0, value)));
  updateDeltaElement(acceptedDelta, deltas.acceptedDelta, value => String(Math.max(0, value)));
  updateDeltaElement(payoutDelta, deltas.payoutDelta, value => formatMoney(Math.max(0, value)));
}

function showToast(boardState, message) {
  const host = boardState.elements.toastHost;
  if (!host) return;
  const toast = document.createElement('div');
  toast.className = 'downwork-toast';
  toast.textContent = message;
  host.appendChild(toast);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
  } else {
    toast.classList.add('is-visible');
  }

  if (boardState.toastTimeout) {
    clearTimeout(boardState.toastTimeout);
  }
  boardState.toastTimeout = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.addEventListener(
      'transitionend',
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, 3200);
}

function resolveFocusHoursLeft(context = {}, models = []) {
  const possibleSources = [
    context?.stats?.focusHoursRemaining,
    context?.stats?.focusHoursLeft,
    context?.summary?.focusHoursRemaining,
    context?.summary?.focusHoursLeft,
    context?.focus?.hoursRemaining,
    context?.focus?.hoursLeft
  ];

  const resolved = possibleSources.find(value => Number.isFinite(value));
  if (Number.isFinite(resolved)) {
    return Math.max(0, resolved);
  }

  const fallback = models.reduce((total, model) => {
    const commitments = Array.isArray(model.commitments) ? model.commitments : [];
    const hours = commitments.reduce((sum, entry) => {
      const remaining = Number(entry?.progress?.hoursRemaining ?? entry?.hoursRemaining ?? entry?.hoursRequired);
      return sum + (Number.isFinite(remaining) ? Math.max(0, remaining) : 0);
    }, 0);
    return total + hours;
  }, 0);

  return Math.max(0, fallback);
}

const DEFAULT_COPY = {
  ready: {
    title: 'Open contracts'
  },
  upcoming: {
    title: 'Opening soon'
  },
  commitments: {
    title: 'In progress'
  }
};

function mergeCopy(base = {}, overrides = {}) {
  return {
    ready: { ...DEFAULT_COPY.ready, ...base.ready, ...overrides.ready },
    upcoming: { ...DEFAULT_COPY.upcoming, ...base.upcoming, ...overrides.upcoming },
    commitments: { ...DEFAULT_COPY.commitments, ...base.commitments, ...overrides.commitments }
  };
}

function createCardSection(copy = {}) {
  const section = document.createElement('section');
  section.className = 'browser-card__section';

  if (copy.title) {
    const heading = document.createElement('h3');
    heading.className = 'browser-card__section-title';
    heading.textContent = copy.title;
    section.appendChild(heading);
  }

  if (copy.description) {
    const note = document.createElement('p');
    note.className = 'browser-card__section-note';
    note.textContent = copy.description;
    section.appendChild(note);
  }

  return section;
}

export function describeMetaSummary({ availableCount, upcomingCount, commitmentCount }) {
  const parts = [];

  if (availableCount > 0) {
    parts.push(`${availableCount} offer${availableCount === 1 ? '' : 's'} ready`);
  }

  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} queued`);
  }

  if (commitmentCount > 0) {
    parts.push(`${commitmentCount} commitment${commitmentCount === 1 ? '' : 's'} active`);
  }

  if (parts.length === 0) {
    return 'No actions ready yet — accept your next contract to kick things off.';
  }

  return `Keep the loop rolling — accept → work → complete. ${parts.join(' • ')}`;
}

export function createHustleCard({
  definition = {},
  model = {},
  copy: copyOverrides = {},
  descriptors: descriptorOverrides = {},
  categoryIcon = '💼',
  onOfferAccept
} = {}) {
  const descriptorBundle = {
    ...(typeof model.descriptors === 'object' && model.descriptors !== null ? model.descriptors : {}),
    ...(typeof descriptorOverrides === 'object' && descriptorOverrides !== null ? descriptorOverrides : {})
  };

  const copy = mergeCopy(descriptorBundle.copy, copyOverrides);

  const rawOffers = Array.isArray(model.offers) ? model.offers : [];
  const rawUpcoming = Array.isArray(model.upcoming) ? model.upcoming : [];
  const visibleOffers = rawOffers.filter(offer => !offer?.locked);
  const visibleUpcoming = rawUpcoming.filter(offer => !offer?.locked);
  const hasCommitments = Array.isArray(model.commitments) && model.commitments.length > 0;

  const hasAnySource = rawOffers.length > 0 || rawUpcoming.length > 0;
  const hasUnlockedContent = visibleOffers.length > 0 || visibleUpcoming.length > 0;

  if (!hasUnlockedContent && hasAnySource && !hasCommitments) {
    return null;
  }

  const card = document.createElement('article');
  card.className = 'browser-card browser-card--action browser-card--hustle downwork-card';
  const hustleId = model.id || definition.id || '';
  card.dataset.action = hustleId;
  card.dataset.hustle = hustleId;
  card.dataset.search = model.filters?.search || '';
  const hustleLabel = model.name || definition.name || 'Contract';
  card.dataset.hustleLabel = hustleLabel;
  const timeValue = Number(model.metrics?.time?.value ?? 0);
  const payoutMetricValue = Number(model.metrics?.payout?.value ?? 0);
  const roiValue = Number(model.metrics?.roi ?? 0);
  const payoutCandidates = visibleOffers
    .map(offer => Number(offer?.payout))
    .filter(value => Number.isFinite(value) && value > 0);
  const cardPayoutValue = payoutCandidates.length
    ? Math.max(...payoutCandidates)
    : payoutMetricValue;
  card.dataset.time = String(timeValue);
  card.dataset.payout = String(cardPayoutValue);
  card.dataset.roi = String(roiValue);
  card.dataset.available = visibleOffers.length > 0 ? 'true' : 'false';
  card.dataset.readyOfferCount = String(Math.max(0, visibleOffers.length));

  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  const categoryKey = resolveCategoryKey(model.actionCategory || model.filters?.category || '');
  card.dataset.category = categoryKey;
  card.dataset.actionCategory = categoryKey;

  const header = document.createElement('header');
  header.className = 'browser-card__header downwork-card__header';
  const icon = document.createElement('span');
  icon.className = 'downwork-card__icon';
  icon.textContent = descriptorBundle.icon || categoryIcon || '💼';
  header.appendChild(icon);
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = hustleLabel;
  header.appendChild(title);
  card.appendChild(header);

  const metricsRow = document.createElement('div');
  metricsRow.className = 'downwork-card__metrics';

  const timeChip = document.createElement('span');
  timeChip.className = 'downwork-card__metric';
  timeChip.textContent = `⏱️ ${model.metrics?.time?.label || formatHours(Math.max(0, timeValue))}`;
  metricsRow.appendChild(timeChip);

  const payoutLabel = model.metrics?.payout?.label
    || (cardPayoutValue > 0 ? `$${formatMoney(cardPayoutValue)}` : 'Varies');
  const payoutChip = document.createElement('span');
  payoutChip.className = 'downwork-card__metric';
  payoutChip.textContent = `💵 ${payoutLabel}`;
  metricsRow.appendChild(payoutChip);

  if (roiValue > 0) {
    const roiChip = document.createElement('span');
    roiChip.className = 'downwork-card__metric downwork-card__metric--roi';
    roiChip.textContent = `📈 ROI ${formatRoi(roiValue)}`;
    metricsRow.appendChild(roiChip);
    if (cardPayoutValue > 0 && timeValue > 0) {
      const tooltip = `ROI ${formatRoi(roiValue)} • $${formatMoney(cardPayoutValue)} ÷ ${formatHours(Math.max(0, timeValue))}`;
      metricsRow.title = tooltip;
      card.title = tooltip;
    }
  }

  card.appendChild(metricsRow);

  if (model.description) {
    const summary = document.createElement('p');
    summary.className = 'browser-card__summary';
    summary.textContent = model.description;
    card.appendChild(summary);
  }

  const badges = Array.isArray(model.badges) ? model.badges : [];
  if (badges.length > 0) {
    const list = document.createElement('ul');
    list.className = 'browser-card__badges';
    badges.forEach(entry => {
      if (!entry) return;
      const item = document.createElement('li');
      item.className = 'browser-card__badge';
      item.textContent = entry;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  const tagEntries = resolveTagEntries(model, definition);
  card.dataset.tagList = JSON.stringify(tagEntries);
  card.dataset.tags = tagEntries.map(entry => entry.id).join(' ');

  if (tagEntries.length > 0) {
    const tagList = document.createElement('ul');
    tagList.className = 'downwork-card__tags';
    tagEntries.forEach(entry => {
      if (!entry) return;
      const item = document.createElement('li');
      item.className = 'downwork-card__tag';
      item.dataset.tagId = entry.id;
      item.textContent = entry.label;
      tagList.appendChild(item);
    });
    card.appendChild(tagList);
  }

  const hasSkillBadge = badges.some(badge => typeof badge === 'string' && /xp/i.test(badge));
  const hasSkillTag = typeof model.tag?.label === 'string' && /skill/i.test(model.tag.label);
  card.dataset.skillXp = hasSkillBadge || hasSkillTag ? 'true' : 'false';

  const meta = document.createElement('p');
  meta.className = 'browser-card__meta';
  meta.textContent = model.requirements?.summary || 'No requirements';
  card.appendChild(meta);

  if (model.seat?.summary) {
    const seat = document.createElement('p');
    seat.className = 'browser-card__note';
    seat.textContent = model.seat.summary;
    card.appendChild(seat);
  }

  if (model.limit?.summary) {
    const limit = document.createElement('p');
    limit.className = 'browser-card__note';
    limit.textContent = model.limit.summary;
    card.appendChild(limit);
  }

  if (model.action?.label) {
    const actions = document.createElement('div');
    actions.className = 'browser-card__actions';

    const queueButton = document.createElement('button');
    queueButton.type = 'button';
    const variantName = model.action.className === 'secondary' ? 'secondary' : 'primary';
    queueButton.className = `browser-card__button browser-card__button--${variantName}`;
    queueButton.textContent = model.action.label || 'Accept & Queue';
    queueButton.disabled = Boolean(model.action.disabled);

    if (typeof model.action?.onClick === 'function') {
      queueButton.addEventListener('click', () => {
        if (queueButton.disabled) return;
        model.action.onClick();
      });
    }

    actions.appendChild(queueButton);

    if (model.action?.guidance) {
      const note = document.createElement('p');
      note.className = 'browser-card__note';
      note.textContent = model.action.guidance;
      actions.appendChild(note);
    }

    card.appendChild(actions);
  }

  if (hasCommitments) {
    const commitmentsSection = createCardSection(copy.commitments);
    const list = createCommitmentList(model.commitments);
    commitmentsSection.appendChild(list);
    card.appendChild(commitmentsSection);
  }

  if (visibleOffers.length) {
    const offersSection = createCardSection(copy.ready);
    const list = createOfferList(visibleOffers, { onAccept: onOfferAccept, model });
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

  if (visibleUpcoming.length) {
    const upcomingSection = createCardSection(copy.upcoming);
    const list = createOfferList(visibleUpcoming, { upcoming: true, onAccept: onOfferAccept, model });
    upcomingSection.appendChild(list);
    card.appendChild(upcomingSection);
  }

  const expiresCandidates = [...visibleOffers, ...visibleUpcoming]
    .map(offer => Number(offer?.expiresIn))
    .filter(value => Number.isFinite(value));
  if (expiresCandidates.length) {
    card.dataset.expiresIn = String(Math.min(...expiresCandidates));
  }

  return card;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, () => {});

  if (!refs) return null;

  const { boardPanel, hirePanel, state: appState } = ensureDownworkApp(refs.body) || {};
  if (!boardPanel || !hirePanel) {
    return null;
  }

  const board = ensureBoard(boardPanel);
  if (!board) return null;

  const list = board.querySelector('[data-role="browser-hustle-list"]');
  const tabsContainer = board.querySelector('[data-role="downwork-tabs"]');
  const filtersContainer = board.querySelector('[data-role="downwork-filters"]');

  if (!list || !tabsContainer || !filtersContainer) {
    return null;
  }

  const boardState = getBoardState(board);
  boardState.elements = {
    ...boardState.elements,
    focusValue: board.querySelector('[data-role="downwork-focus-value"]'),
    focusDelta: board.querySelector('[data-role="downwork-focus-delta"]'),
    acceptedValue: board.querySelector('[data-role="downwork-accepted-value"]'),
    acceptedDelta: board.querySelector('[data-role="downwork-accepted-delta"]'),
    payoutValue: board.querySelector('[data-role="downwork-payout-value"]'),
    payoutDelta: board.querySelector('[data-role="downwork-payout-delta"]'),
    toastHost: board.querySelector('[data-role="downwork-toast-host"]'),
    grid: list
  };

  const sessionConfig = ensureDownworkSessionConfig();
  if (sessionConfig) {
    const savedQuickFilters = normalizeFilterIds(sessionConfig.quickFilters);
    boardState.activeFilters = new Set(savedQuickFilters);

    const savedCategoryFilters = normalizeFilterIds(sessionConfig.categoryFilters);
    boardState.activeCategoryFilters = new Set(savedCategoryFilters);

    if (typeof sessionConfig.activeCategory === 'string') {
      const normalizedCategory = resolveCategoryKey(sessionConfig.activeCategory);
      if (normalizedCategory) {
        boardState.activeCategory = normalizedCategory;
      }
    }
  }

  const persistFilterState = () => {
    if (!sessionConfig) return;

    const quickFilters = Array.from(boardState.activeFilters || [])
      .map(id => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean)
      .sort((a, b) => {
        const orderA = QUICK_FILTER_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
        const orderB = QUICK_FILTER_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.localeCompare(b);
      });

    const categoryFilters = Array.from(boardState.activeCategoryFilters || [])
      .map(id => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean)
      .sort();

    sessionConfig.quickFilters = quickFilters;
    sessionConfig.categoryFilters = categoryFilters;
    const normalizedCategory = resolveCategoryKey(boardState.activeCategory || '');
    sessionConfig.activeCategory = normalizedCategory || null;
  };

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;
  let commitmentCount = 0;
  let upcomingCount = 0;
  let potentialPayout = 0;

  const cardsByCategory = new Map();
  const categoryMetadata = new Map();
  const allCards = [];

  const handleOfferAccepted = ({ payout = 0, focusHours = 0 } = {}) => {
    const payoutValue = Number.isFinite(payout) ? payout : 0;
    const focusValue = Number.isFinite(focusHours) ? focusHours : 0;
    const payoutLabel = formatMoney(Math.max(0, payoutValue));
    const focusLabel = formatHours(Math.max(0, focusValue));
    showToast(boardState, `Added to your hustle queue 💼 (+$${payoutLabel} payout, −${focusLabel} focus)`);
    const nextSummary = {
      focusHours: Math.max(0, boardState.summary.focusHours - focusValue),
      acceptedCount: boardState.summary.acceptedCount + 1,
      potentialPayout: Math.max(0, boardState.summary.potentialPayout - payoutValue)
    };
    updateSummaryDisplay(boardState, nextSummary, {
      focusHoursDelta: -focusValue,
      acceptedDelta: 1,
      payoutDelta: -payoutValue
    });
  };

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    const readyOffers = Array.isArray(model.offers)
      ? model.offers.filter(offer => !offer?.locked)
      : [];
    const upcomingOffers = Array.isArray(model.upcoming)
      ? model.upcoming.filter(offer => !offer?.locked)
      : [];

    if (readyOffers.length > 0) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
    }

    if (upcomingOffers.length > 0) {
      upcomingCount += upcomingOffers.length;
    }

    const readyPayoutTotal = readyOffers.reduce((sum, offer) => {
      const payout = Number(offer?.payout);
      return sum + (Number.isFinite(payout) ? Math.max(0, payout) : 0);
    }, 0);
    if (readyPayoutTotal > 0) {
      potentialPayout += readyPayoutTotal;
    } else if (Number.isFinite(model.metrics?.payout?.value)) {
      potentialPayout += Math.max(0, Number(model.metrics.payout.value));
    }

    const categoryKey = resolveCategoryKey(model.actionCategory || model.filters?.category || '');
    const categoryConfig = resolveCategoryConfig(categoryKey);
    categoryMetadata.set(categoryKey, categoryConfig);

    const card = createHustleCard({
      definition,
      model,
      categoryIcon: categoryConfig.icon,
      onOfferAccept: handleOfferAccepted
    });

    if (!card) {
      return;
    }

    card.dataset.categoryLabel = categoryConfig.label;

    if (!cardsByCategory.has(categoryKey)) {
      cardsByCategory.set(categoryKey, []);
    }
    cardsByCategory.get(categoryKey).push(card);
    allCards.push(card);
  });

  tabsContainer.innerHTML = '';
  filtersContainer.innerHTML = '';
  list.innerHTML = '';

  const payoutValues = allCards
    .map(card => Number(card.dataset.payout))
    .filter(value => Number.isFinite(value) && value > 0);
  const timeValues = allCards
    .map(card => Number(card.dataset.time))
    .filter(value => Number.isFinite(value) && value > 0);
  const expiringValues = allCards
    .map(card => Number(card.dataset.expiresIn))
    .filter(value => Number.isFinite(value) && value >= 0);

  const avgPayout = payoutValues.length
    ? payoutValues.reduce((sum, value) => sum + value, 0) / payoutValues.length
    : 0;
  const avgTime = timeValues.length
    ? timeValues.reduce((sum, value) => sum + value, 0) / timeValues.length
    : 0;
  const minExpiry = expiringValues.length ? Math.min(...expiringValues) : Infinity;

  boardState.thresholds = {
    payoutHigh: avgPayout > 0 ? avgPayout : 0,
    shortTask: avgTime > 0 ? Math.min(2, Math.max(0.5, avgTime)) : 2,
    expiringSoon: Number.isFinite(minExpiry) ? Math.min(2, Math.max(0, minExpiry)) : 2
  };

  const categoryFilterMeta = new Map();
  allCards.forEach(card => {
    const id = (card.dataset.hustle || '').trim();
    const label = (card.dataset.hustleLabel || '').trim();
    if (!id || !label) return;
    if (!categoryFilterMeta.has(id)) {
      categoryFilterMeta.set(id, { id, label, ready: 0, cards: 0 });
    }
    const meta = categoryFilterMeta.get(id);
    const readyCount = Number(card.dataset.readyOfferCount);
    if (Number.isFinite(readyCount) && readyCount > 0) {
      meta.ready += readyCount;
    }
    meta.cards += 1;
  });
  boardState.availableCategoryFilters = categoryFilterMeta;
  boardState.activeCategoryFilters = new Set(
    [...boardState.activeCategoryFilters].filter(id => categoryFilterMeta.has(id))
  );

  const focusHoursLeft = resolveFocusHoursLeft(context, models);
  updateSummaryDisplay(boardState, {
    focusHours: focusHoursLeft,
    acceptedCount: commitmentCount,
    potentialPayout
  });

  const sortedCategories = Array.from(cardsByCategory.keys()).sort((a, b) => {
    const orderDiff = getCategorySortIndex(a) - getCategorySortIndex(b);
    if (orderDiff !== 0) return orderDiff;
    const labelA = (categoryMetadata.get(a)?.label || '').toLowerCase();
    const labelB = (categoryMetadata.get(b)?.label || '').toLowerCase();
    return labelA.localeCompare(labelB);
  });

  const validFilters = new Set(QUICK_FILTERS.map(filter => filter.id));
  boardState.activeFilters = new Set(
    [...boardState.activeFilters].filter(id => validFilters.has(id))
  );

  if (!sortedCategories.length) {
    boardState.activeCategory = null;
    boardState.activeFilters.clear();
    boardState.activeCategoryFilters.clear();
    persistFilterState();
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue an action to see it spotlighted here.';
    list.appendChild(empty);
    updateTabMeta(appState, 'gigs', describeBoardNavSummary({ availableCount, upcomingCount, commitmentCount }));
    const updateHireMeta = () => {
      updateTabMeta(appState, 'hire', describeHireNavSummary());
    };
    renderHirePanel(hirePanel, { onStateChange: updateHireMeta });
    updateHireMeta();
    const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });
    return {
      id: page.id,
      meta
    };
  }

  if (!boardState.activeCategory || !cardsByCategory.has(boardState.activeCategory)) {
    boardState.activeCategory = sortedCategories[0];
  }

  persistFilterState();

  const tabButtons = new Map();
  sortedCategories.forEach(categoryKey => {
    const config = categoryMetadata.get(categoryKey) || DEFAULT_CATEGORY_CONFIG;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-tab';
    button.dataset.categoryKey = categoryKey;
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'downwork-tab__icon';
    icon.textContent = config.icon || '💼';

    const label = document.createElement('span');
    label.className = 'downwork-tab__label';
    label.textContent = config.label;

    button.append(icon, label);
    tabsContainer.appendChild(button);
    tabButtons.set(categoryKey, button);
  });

  const filterButtons = new Map();
  if (QUICK_FILTERS.length) {
    const { row, chips } = createFilterRow('Quick filters');
    filtersContainer.appendChild(row);
    QUICK_FILTERS.forEach(filter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'downwork-filter';
      button.dataset.filterId = filter.id;
      button.textContent = filter.label;
      const isActive = boardState.activeFilters.has(filter.id);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      button.addEventListener('click', () => {
        if (boardState.activeFilters.has(filter.id)) {
          boardState.activeFilters.delete(filter.id);
        } else {
          boardState.activeFilters.add(filter.id);
        }
        updateFilterSelection();
        renderActiveCategory();
        persistFilterState();
      });

      chips.appendChild(button);
      filterButtons.set(filter.id, button);
    });
  }

  const categoryFilterButtons = new Map();
  const categoryFilterEntries = Array.from(boardState.availableCategoryFilters.values())
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      count: entry.ready > 0 ? entry.ready : entry.cards
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

  if (categoryFilterEntries.length) {
    const { row, chips } = createFilterRow('Hustle types');
    filtersContainer.appendChild(row);

    categoryFilterEntries.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'downwork-filter downwork-filter--category';
      button.dataset.categoryId = entry.id;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'downwork-filter__label';
      labelSpan.textContent = entry.label;
      button.appendChild(labelSpan);

      const countBadge = document.createElement('span');
      countBadge.className = 'downwork-filter__count';
      countBadge.textContent = String(entry.count);
      button.appendChild(countBadge);

      const isActive = boardState.activeCategoryFilters.has(entry.id);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      button.addEventListener('click', () => {
        if (boardState.activeCategoryFilters.has(entry.id)) {
          boardState.activeCategoryFilters.delete(entry.id);
        } else {
          boardState.activeCategoryFilters.add(entry.id);
        }
        updateFilterSelection();
        renderActiveCategory();
        persistFilterState();
      });

      chips.appendChild(button);
      categoryFilterButtons.set(entry.id, button);
    });
  }

  const filterPredicates = {
    highPayout: card => {
      const threshold = boardState.thresholds.payoutHigh;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return Number(card.dataset.payout) > 0;
      }
      const payout = Number(card.dataset.payout);
      return Number.isFinite(payout) ? payout >= threshold : false;
    },
    shortTasks: card => {
      const threshold = boardState.thresholds.shortTask;
      const time = Number(card.dataset.time);
      if (!Number.isFinite(time)) return false;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return time > 0;
      }
      return time <= threshold;
    },
    skillXp: card => card.dataset.skillXp === 'true',
    expiringSoon: card => {
      const threshold = boardState.thresholds.expiringSoon;
      const expires = Number(card.dataset.expiresIn);
      if (!Number.isFinite(expires)) return false;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return expires <= 2;
      }
      return expires <= threshold;
    }
  };

  function cardMatchesActiveCategoryFilters(card) {
    if (!boardState.activeCategoryFilters.size) {
      return true;
    }
    const id = (card.dataset.hustle || '').trim();
    if (!id) return false;
    return boardState.activeCategoryFilters.has(id);
  }

  function applyActiveFilters(cards = []) {
    const predicates = [...boardState.activeFilters]
      .map(id => filterPredicates[id])
      .filter(Boolean);
    if (!predicates.length && !boardState.activeCategoryFilters.size) {
      return cards.slice();
    }
    return cards.filter(card => {
      if (predicates.length && !predicates.every(predicate => predicate(card))) {
        return false;
      }
      return cardMatchesActiveCategoryFilters(card);
    });
  }

  function updateTabSelection() {
    tabButtons.forEach((button, key) => {
      const isActive = key === boardState.activeCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    board.dataset.activeCategory = boardState.activeCategory || '';
  }

  function hasActiveFilters() {
    return boardState.activeFilters.size > 0 || boardState.activeCategoryFilters.size > 0;
  }

  function updateQuickFilterSelection() {
    filterButtons.forEach((button, id) => {
      const isActive = boardState.activeFilters.has(id);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function updateCategoryFilterSelection() {
    categoryFilterButtons.forEach((button, id) => {
      const isActive = boardState.activeCategoryFilters.has(id);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function updateFilterSelection() {
    updateQuickFilterSelection();
    updateCategoryFilterSelection();
    const filtered = hasActiveFilters();
    board.classList.toggle('is-filtered', filtered);
    list.classList.toggle('is-filtered', filtered);
  }

  function renderActiveCategory() {
    list.innerHTML = '';
    const activeKey = boardState.activeCategory;
    const cards = cardsByCategory.get(activeKey) || [];
    const filtered = applyActiveFilters(cards);
    const isFiltered = hasActiveFilters();
    list.classList.toggle('is-filtered', isFiltered);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'browser-empty browser-empty--compact';
      empty.textContent = isFiltered
        ? 'No gigs match these filters yet. Adjust or clear a filter to see more leads.'
        : 'Queue an action to see it spotlighted here.';
      list.appendChild(empty);
      return;
    }

    filtered.forEach(card => {
      list.appendChild(card);
    });
  }

  tabButtons.forEach((button, key) => {
    button.addEventListener('click', () => {
      if (boardState.activeCategory === key) return;
      boardState.activeCategory = key;
      updateTabSelection();
      renderActiveCategory();
      persistFilterState();
    });
  });

  updateTabSelection();
  updateFilterSelection();
  renderActiveCategory();

  updateTabMeta(appState, 'gigs', describeBoardNavSummary({ availableCount, upcomingCount, commitmentCount }));

  const updateHireMeta = () => {
    updateTabMeta(appState, 'hire', describeHireNavSummary());
  };
  renderHirePanel(hirePanel, { onStateChange: updateHireMeta });
  updateHireMeta();

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
