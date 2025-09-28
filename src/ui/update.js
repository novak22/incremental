import elements from './elements.js';
import { renderCardCollections, updateAllCards } from './cards.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import { computeDailySummary } from '../game/summary.js';
import { renderSummary } from './dashboard.js';
import { applyCardFilters } from './layout.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';
import { getTimeCap } from '../game/time.js';
import { ASSISTANT_CONFIG, getAssistantCount } from '../game/assistant.js';

const DAY_TOTAL_HOURS = 24;
const HOURS_EPSILON = 0.01;
const MANUAL_LEGEND_LIMIT = 4;

const SEGMENT_STYLE_MAP = {
  sleep: { className: 'time-segment--sleep', legendVar: 'var(--time-sleep)' },
  setup: { className: 'time-segment--setup', legendVar: 'var(--time-setup)' },
  maintenance: { className: 'time-segment--maintenance', legendVar: 'var(--time-maintenance)' },
  hustle: { className: 'time-segment--hustle', legendVar: 'var(--time-hustle)' },
  study: { className: 'time-segment--study', legendVar: 'var(--time-study)' },
  quality: { className: 'time-segment--quality', legendVar: 'var(--time-quality)' },
  upgrade: { className: 'time-segment--upgrade', legendVar: 'var(--time-upgrade)' },
  automation: { className: 'time-segment--automation', legendVar: 'var(--time-upgrade)' },
  remaining: { className: 'time-segment--remaining', legendVar: 'var(--time-remaining)' },
  general: { className: 'time-segment--general', legendVar: 'var(--time-general)' }
};

function normalizeCategory(category) {
  if (!category) return 'general';
  const normalized = String(category).toLowerCase();
  const [prefix] = normalized.split(':');
  return SEGMENT_STYLE_MAP[prefix] ? prefix : normalized;
}

function getSegmentStyle(category) {
  const normalized = normalizeCategory(category);
  return SEGMENT_STYLE_MAP[normalized] || SEGMENT_STYLE_MAP.general;
}

function renderTimeLegend(playerSegments, assistantSegments = []) {
  if (!elements.timeLegend) return;
  const legend = elements.timeLegend;
  legend.innerHTML = '';

  const sleepSegment = playerSegments.find(segment => segment.key === 'sleep');
  const manualSegments = playerSegments.filter(
    segment => segment.key !== 'sleep' && !segment.isRemaining && !segment.isSummary
  );
  const remainingSegment = playerSegments.find(segment => segment.isRemaining);
  const assistantManual = assistantSegments.filter(
    segment => !segment.isRemaining && !segment.isSummary
  );
  const assistantRemaining = assistantSegments.find(segment => segment.isRemaining);

  const legendEntries = [];
  if (sleepSegment) {
    legendEntries.push({ ...sleepSegment });
  }

  manualSegments
    .slice(0, MANUAL_LEGEND_LIMIT)
    .forEach(segment => legendEntries.push({ ...segment }));

  const overflow = manualSegments.slice(MANUAL_LEGEND_LIMIT);
  if (overflow.length) {
    const hours = overflow.reduce((total, segment) => total + segment.hours, 0);
    legendEntries.push({
      key: 'time:overflow',
      label: `+${overflow.length} more`,
      hours,
      style: getSegmentStyle('general'),
      isSummary: true
    });
  }

  if (remainingSegment) {
    legendEntries.push({ ...remainingSegment });
  }

  assistantManual.forEach(segment => {
    legendEntries.push({
      ...segment,
      label: `Assistants • ${segment.label}`,
      isAssistant: true
    });
  });

  if (assistantRemaining) {
    legendEntries.push({
      ...assistantRemaining,
      label: 'Assistants • Idle capacity',
      isAssistant: true
    });
  }

  for (const entry of legendEntries) {
    const item = legend.ownerDocument.createElement('li');
    if (entry.isAssistant) {
      item.dataset.group = 'assistant';
    }
    const dot = legend.ownerDocument.createElement('span');
    dot.className = 'time-legend__dot';
    if (entry.style?.legendVar) {
      item.style.setProperty('--legend-color', entry.style.legendVar);
    }
    const label = legend.ownerDocument.createElement('span');
    label.textContent = entry.label;
    const value = legend.ownerDocument.createElement('span');
    value.textContent = formatHours(entry.hours);
    item.append(dot, label, value);
    legend.appendChild(item);
  }

  const toggle = elements.timeLegendToggle;
  const hasEntries = legendEntries.length > 0;
  if (toggle) {
    let expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (!hasEntries && expanded) {
      expanded = false;
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.disabled = !hasEntries;
    toggle.textContent = expanded ? 'Hide timeline legend' : 'Show timeline legend';
    legend.hidden = !hasEntries || !expanded;
  } else {
    legend.hidden = !hasEntries;
  }
}

function renderTimeProgress(summary) {
  if (!elements.timeProgress) return;

  const state = getState();
  const timeCap = Math.max(0, getTimeCap());
  const timeLeft = Math.max(0, Number(state?.timeLeft) || 0);
  const totalDayHours = Math.max(DAY_TOTAL_HOURS, timeCap);
  const sleepHours = Math.max(0, totalDayHours - timeCap);

  const playerSegments = [];
  const assistantSegments = [];

  if (sleepHours > HOURS_EPSILON) {
    playerSegments.push({
      key: 'sleep',
      label: 'Sleep',
      hours: sleepHours,
      category: 'sleep',
      style: getSegmentStyle('sleep'),
      owner: 'player'
    });
  }

  if (Array.isArray(summary?.timeBreakdown)) {
    summary.timeBreakdown.forEach((entry, index) => {
      const hours = Number(entry?.hours) || 0;
      if (hours <= HOURS_EPSILON) return;
      const category = entry?.category || entry?.definition?.category || 'general';
      const normalized = normalizeCategory(category);
      const segment = {
        key: entry.key || entry.label || `${normalized}:${index}`,
        label: entry.label || entry.key || `Activity ${index + 1}`,
        hours,
        category: normalized,
        style: getSegmentStyle(category)
      };
      if (normalized === 'maintenance') {
        assistantSegments.push({ ...segment, owner: 'assistant' });
      } else {
        playerSegments.push({ ...segment, owner: 'player' });
      }
    });
  }

  const playerUsedHours = Math.max(0, Math.min(timeCap, timeCap - timeLeft));
  const trackedPlayerHours = playerSegments
    .filter(segment => segment.owner === 'player' && segment.key !== 'sleep')
    .reduce((total, segment) => total + segment.hours, 0);
  const untrackedHours = Math.max(0, playerUsedHours - trackedPlayerHours);
  if (untrackedHours > HOURS_EPSILON) {
    playerSegments.push({
      key: 'player:untracked',
      label: 'Untracked time',
      hours: untrackedHours,
      category: 'general',
      style: getSegmentStyle('general'),
      owner: 'player',
      isSummary: true
    });
  }

  const remainingHours = Math.max(0, Math.min(timeCap, timeLeft));
  if (remainingHours > HOURS_EPSILON) {
    playerSegments.push({
      key: 'unscheduled',
      label: 'Unscheduled',
      hours: remainingHours,
      style: getSegmentStyle('remaining'),
      owner: 'player',
      isRemaining: true
    });
  }

  const renderSegments = (container, segments, { ownerPrefix = '' } = {}) => {
    if (!container) return;
    container.innerHTML = '';
    for (const segment of segments) {
      if (segment.hours <= HOURS_EPSILON) continue;
      const node = container.ownerDocument.createElement('div');
      const classNames = ['time-segment'];
      if (segment.style?.className) {
        classNames.push(segment.style.className);
      }
      node.className = classNames.join(' ');
      node.style.setProperty('--segment-hours', String(segment.hours));
      const prefix = ownerPrefix ? `${ownerPrefix} • ` : '';
      node.title = `${prefix}${segment.label} • ${formatHours(segment.hours)}`;
      container.appendChild(node);
    }
  };

  renderSegments(elements.timeProgress, playerSegments, { ownerPrefix: '' });

  const assistantWrapper = elements.assistantSupport;
  const assistantCapacity = Math.max(
    0,
    getAssistantCount(state) * ASSISTANT_CONFIG.hoursPerAssistant
  );
  const assistantUsed = assistantSegments.reduce((total, segment) => total + segment.hours, 0);
  const assistantBarSegments = [...assistantSegments];
  const assistantIdle = Math.max(0, assistantCapacity - assistantUsed);
  if (assistantIdle > HOURS_EPSILON) {
    assistantBarSegments.push({
      key: 'assistant:idle',
      label: 'Idle capacity',
      hours: assistantIdle,
      style: getSegmentStyle('remaining'),
      owner: 'assistant',
      isRemaining: true
    });
  }

  if (assistantWrapper && elements.assistantProgress) {
    const shouldShowAssistants = assistantBarSegments.length > 0 || assistantCapacity > 0;
    assistantWrapper.hidden = !shouldShowAssistants;
    if (shouldShowAssistants) {
      renderSegments(elements.assistantProgress, assistantBarSegments, {
        ownerPrefix: 'Assistants'
      });
      if (elements.assistantNote) {
        if (assistantUsed <= HOURS_EPSILON) {
          elements.assistantNote.textContent = assistantCapacity > 0
            ? 'Idle and ready for upkeep.'
            : 'No upkeep logged yet.';
        } else if (assistantCapacity > 0) {
          elements.assistantNote.textContent = `${formatHours(
            assistantUsed
          )} keeping upkeep humming.`;
        } else {
          elements.assistantNote.textContent = `${formatHours(
            assistantUsed
          )} of upkeep handled manually.`;
        }
      }
    } else {
      elements.assistantProgress.innerHTML = '';
      if (elements.assistantNote) {
        elements.assistantNote.textContent = '';
      }
    }
  }

  const manualSegments = playerSegments.filter(
    segment => segment.key !== 'sleep' && !segment.isRemaining && !segment.isSummary
  );
  const manualHours = manualSegments.reduce((total, segment) => total + segment.hours, 0);
  const currentHours = Math.min(timeCap, playerUsedHours);

  if (elements.time) {
    elements.time.textContent = `${formatHours(currentHours)} / ${formatHours(timeCap)}`;
  }

  if (elements.timeNote) {
    if (!manualSegments.length) {
      elements.timeNote.textContent = 'Sleep banked, hustle ready.';
    } else {
      const actionLabel = manualSegments.length === 1 ? 'action' : 'actions';
      elements.timeNote.textContent = `${formatHours(manualHours)} across ${manualSegments.length} ${actionLabel}`;
    }
  }

  renderTimeLegend(playerSegments, assistantBarSegments);
}

function buildCollections() {
  const hustles = registry.hustles.filter(hustle => hustle.tag?.type !== 'study');
  const education = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  return {
    hustles,
    education,
    assets: registry.assets,
    upgrades: registry.upgrades
  };
}

export function renderCards() {
  const collections = buildCollections();
  renderCardCollections(collections);
  applyCardFilters();
}

export function updateUI() {
  const state = getState();
  if (!state) return;

  const summary = computeDailySummary(state);
  elements.money.textContent = `$${formatMoney(state.money)}`;
  renderTimeProgress(summary);
  elements.day.textContent = state.day;

  const collections = buildCollections();
  updateAllCards(collections);

  renderSummary(summary);
  applyCardFilters();
  refreshActionCatalogDebug();
}
