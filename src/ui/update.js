import elements from './elements.js';
import { renderCardCollections, updateAllCards } from './cards.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import { computeDailySummary } from '../game/summary.js';
import { renderSummary } from './dashboard.js';
import { applyCardFilters } from './layout.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';

const DAY_TOTAL_HOURS = 24;
const BASE_SLEEP_HOURS = 8;
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

function renderTimeLegend(segments) {
  if (!elements.timeLegend) return;
  const legend = elements.timeLegend;
  legend.innerHTML = '';

  const sleepSegment = segments.find(segment => segment.key === 'sleep');
  const manualSegments = segments.filter(
    segment => segment.key !== 'sleep' && !segment.isRemaining && !segment.isSummary
  );
  const remainingSegment = segments.find(segment => segment.isRemaining);

  const legendEntries = [];
  if (sleepSegment) {
    legendEntries.push(sleepSegment);
  }

  manualSegments.slice(0, MANUAL_LEGEND_LIMIT).forEach(segment => legendEntries.push(segment));

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
    legendEntries.push(remainingSegment);
  }

  for (const entry of legendEntries) {
    const item = legend.ownerDocument.createElement('li');
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
}

function renderTimeProgress(summary) {
  if (!elements.timeProgress) return;

  const segments = [];

  segments.push({
    key: 'sleep',
    label: 'Sleep',
    hours: BASE_SLEEP_HOURS,
    style: getSegmentStyle('sleep')
  });

  if (Array.isArray(summary?.timeBreakdown)) {
    for (const entry of summary.timeBreakdown) {
      const hours = Number(entry?.hours) || 0;
      if (hours <= 0) continue;
      const category = entry?.category || entry?.definition?.category || 'general';
      segments.push({
        key: entry.key || entry.label,
        label: entry.label,
        hours,
        category,
        style: getSegmentStyle(category)
      });
    }
  }

  const usedHours = segments.reduce((total, segment) => total + segment.hours, 0);
  const remainingHours = Math.max(0, DAY_TOTAL_HOURS - usedHours);
  if (remainingHours > 0.01) {
    segments.push({
      key: 'unscheduled',
      label: 'Unscheduled',
      hours: remainingHours,
      style: getSegmentStyle('remaining'),
      isRemaining: true
    });
  }

  const container = elements.timeProgress;
  container.innerHTML = '';
  for (const segment of segments) {
    if (segment.hours <= 0) continue;
    const node = container.ownerDocument.createElement('div');
    const classNames = ['time-segment'];
    if (segment.style?.className) {
      classNames.push(segment.style.className);
    }
    node.className = classNames.join(' ');
    node.style.setProperty('--segment-hours', String(segment.hours));
    node.title = `${segment.label} • ${formatHours(segment.hours)}`;
    container.appendChild(node);
  }

  const manualSegments = segments.filter(segment => segment.key !== 'sleep' && !segment.isRemaining);
  const manualHours = manualSegments.reduce((total, segment) => total + segment.hours, 0);
  const currentHours = Math.min(DAY_TOTAL_HOURS, BASE_SLEEP_HOURS + manualHours);

  if (elements.time) {
    elements.time.textContent = `${formatHours(currentHours)} / ${formatHours(DAY_TOTAL_HOURS)}`;
  }

  if (elements.timeNote) {
    if (!manualSegments.length) {
      elements.timeNote.textContent = 'Sleep banked, hustle ready.';
    } else {
      const actionLabel = manualSegments.length === 1 ? 'action' : 'actions';
      elements.timeNote.textContent = `${formatHours(manualHours)} across ${manualSegments.length} ${actionLabel}`;
    }
  }

  renderTimeLegend(segments);
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
