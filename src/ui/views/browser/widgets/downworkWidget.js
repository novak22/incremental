import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getState } from '../../../../core/state.js';
import { executeAction } from '../../../../game/actions.js';
import { getAvailableOffers, acceptHustleOffer } from '../../../../game/hustles.js';
import { getActionDefinition } from '../../../../game/registryService.js';
import { describeHustleRequirements } from '../../../../game/hustles/helpers.js';
import { describeHustleOfferMeta } from '../../../hustles/offerHelpers.js';

const SORT_COMPARATORS = {
  rate: (a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    if (b.payout !== a.payout) return b.payout - a.payout;
    if (a.hours !== b.hours) return a.hours - b.hours;
    return a.label.localeCompare(b.label);
  },
  payout: (a, b) => {
    if (b.payout !== a.payout) return b.payout - a.payout;
    if (b.rate !== a.rate) return b.rate - a.rate;
    if (a.hours !== b.hours) return a.hours - b.hours;
    return a.label.localeCompare(b.label);
  },
  time: (a, b) => {
    if (a.hours !== b.hours) return a.hours - b.hours;
    if (b.rate !== a.rate) return b.rate - a.rate;
    if (b.payout !== a.payout) return b.payout - a.payout;
    return a.label.localeCompare(b.label);
  }
};

let elements = null;
let initialized = false;
let currentSort = 'rate';
let cachedEntries = [];

function toFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getAvailableTime(state = {}) {
  const available = toFinite(state?.timeLeft, 0);
  return available > 0 ? available : 0;
}

function getCurrentDay(state = {}) {
  const day = Math.floor(toFinite(state?.day, 1));
  return day > 0 ? day : 1;
}

function requirementsMet(definition, state, describeRequirementsFn = describeHustleRequirements) {
  if (!definition) return false;
  const descriptors = describeRequirementsFn(definition, state) || [];
  return !descriptors.some(entry => entry && entry.met === false);
}

function buildOfferEntries(
  state,
  {
    getOffers = getAvailableOffers,
    getDefinition = getActionDefinition,
    describeRequirementsFn = describeHustleRequirements,
    describeMeta = describeHustleOfferMeta
  } = {}
) {
  const workingState = state || getState();
  if (!workingState) return [];

  const offers = getOffers(workingState, { includeUpcoming: false, includeClaimed: false }) || [];
  const availableTime = getAvailableTime(workingState);
  const currentDay = getCurrentDay(workingState);

  return offers
    .map(offer => {
      if (!offer?.id) return null;
      const definitionId = offer.definitionId || offer.templateId;
      if (!definitionId) return null;
      const definition = getDefinition(definitionId);
      if (!requirementsMet(definition, workingState, describeRequirementsFn)) {
        return null;
      }

      const meta = describeMeta({
        offer,
        definition,
        currentDay,
        formatHoursFn: formatHours,
        formatMoneyFn: formatMoney
      });
      if (!meta || meta.availableIn > 0) {
        return null;
      }

      const rawHours = toFinite(meta.hours, 0);
      const hours = rawHours > 0 ? rawHours : 0;
      if (hours > availableTime + 1e-6) {
        return null;
      }

      const rawPayout = toFinite(meta.payout, 0);
      const payout = rawPayout > 0 ? rawPayout : 0;
      const rate = hours > 0 ? payout / hours : payout;

      const label = offer?.variant?.label || definition?.name || 'Contract offer';
      const description = offer?.variant?.description || definition?.description || '';
      const summaryParts = [meta.summary, meta.seatSummary].filter(Boolean);

      return {
        id: offer.id,
        label,
        description,
        summary: summaryParts.join(' • '),
        hours,
        payout,
        rate,
        hoursLabel: formatHours(hours),
        payoutLabel: payout > 0 ? `$${formatMoney(payout)}` : '$0',
        rateLabel: `$${formatMoney(rate)}/h`
      };
    })
    .filter(Boolean);
}

function sortEntries(entries = [], sortKey = 'rate') {
  const comparator = SORT_COMPARATORS[sortKey] || SORT_COMPARATORS.rate;
  return [...entries].sort(comparator);
}

function ensureElements(widgetElements = {}) {
  if (initialized) return;
  elements = widgetElements;
  const buttons = Array.from(widgetElements?.sortButtons || []);
  buttons.forEach(button => {
    button.addEventListener('click', event => {
      const sortKey = event.currentTarget?.dataset?.sort;
      if (!sortKey || sortKey === currentSort) {
        updateSortControls();
        return;
      }
      currentSort = sortKey;
      updateSortControls();
      renderList(sortEntries(cachedEntries, currentSort));
    });
  });
  initialized = true;
  updateSortControls();
}

function updateSortControls() {
  const buttons = Array.from(elements?.sortButtons || []);
  buttons.forEach(button => {
    const sortKey = button?.dataset?.sort;
    const isActive = sortKey === currentSort;
    button?.setAttribute?.('aria-pressed', String(isActive));
  });
}

function createStat(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'downwork-widget__stat';

  const term = document.createElement('span');
  term.className = 'downwork-widget__stat-label';
  term.textContent = label;

  const statValue = document.createElement('span');
  statValue.className = 'downwork-widget__stat-value';
  statValue.textContent = value;

  wrapper.append(term, statValue);
  return wrapper;
}

function createListItem(entry) {
  const item = document.createElement('li');
  item.className = 'downwork-widget__item';

  const header = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'downwork-widget__title';
  title.textContent = entry.label;
  header.appendChild(title);

  if (entry.summary) {
    const meta = document.createElement('p');
    meta.className = 'downwork-widget__meta';
    meta.textContent = entry.summary;
    header.appendChild(meta);
  }

  item.appendChild(header);

  if (entry.description) {
    const description = document.createElement('p');
    description.className = 'downwork-widget__description';
    description.textContent = entry.description;
    item.appendChild(description);
  }

  const stats = document.createElement('div');
  stats.className = 'downwork-widget__stats';
  stats.append(
    createStat('Time', entry.hoursLabel),
    createStat('Payout', entry.payoutLabel),
    createStat('Per hour', entry.rateLabel)
  );
  item.appendChild(stats);

  const actions = document.createElement('div');
  actions.className = 'downwork-widget__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'downwork-widget__accept';
  button.textContent = 'Accept gig';
  button.setAttribute('aria-label', `Accept ${entry.label}`);
  button.addEventListener('click', () => {
    button.disabled = true;
    const accepted = acceptOffer(entry.id);
    if (!accepted) {
      button.disabled = false;
    }
  });

  actions.appendChild(button);
  item.appendChild(actions);

  return item;
}

function acceptOffer(offerId) {
  if (!offerId) return false;
  let accepted = null;
  const state = getState();
  executeAction(() => {
    accepted = acceptHustleOffer(offerId, { state });
  });
  if (accepted) {
    render({ state: getState() });
    return true;
  }
  return false;
}

function renderList(entries = []) {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  entries.forEach(entry => {
    const item = createListItem(entry);
    elements.list.appendChild(item);
  });
}

function updateEmptyState(entries = [], state = {}) {
  if (!elements?.empty) return;
  if (entries.length > 0) {
    elements.empty.hidden = true;
    return;
  }

  const availableTime = getAvailableTime(state);
  const formatted = formatHours(availableTime);
  if (availableTime <= 0) {
    elements.empty.textContent = 'You are out of focus hours today — log hours or end the day to reveal fresh gigs.';
  } else {
    elements.empty.textContent = `No unlocked gigs match your ${formatted} focus window right now. Check back after the next market roll.`;
  }
  elements.empty.hidden = false;
}

function render(context = {}) {
  ensureElements(elements || context?.elements || {});
  const state = context?.state || getState();
  if (!state) return;

  cachedEntries = buildOfferEntries(state);
  const sorted = sortEntries(cachedEntries, currentSort);
  renderList(sorted);
  updateEmptyState(sorted, state);
}

export default {
  init: ensureElements,
  render
};

export const __testables = {
  buildOfferEntries,
  sortEntries,
  getAvailableTime
};
