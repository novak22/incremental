const DAY_START_HOUR = 8;
const DAY_END_HOUR = 24;
const TOTAL_DAY_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const MIN_SEGMENT_HOURS = 0.25;
const UPDATE_INTERVAL_MS = 60_000;

const tickerRegistry = new WeakMap();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDuration(hours, fallback = MIN_SEGMENT_HOURS) {
  const numeric = Number(hours);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
}

function formatDurationLabel(hours) {
  const numeric = Number(hours);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0h';
  }
  if (Math.abs(numeric - Math.round(numeric)) < 1e-2) {
    return `${Math.round(numeric)}h`;
  }
  const precision = numeric < 1 ? 2 : 1;
  return `${numeric.toFixed(precision)}h`;
}

function resolveCategory(entry = {}) {
  const candidates = [entry.focusCategory, entry.category, entry.type];
  if (entry.buckets && typeof entry.buckets === 'object') {
    Object.values(entry.buckets).forEach(value => {
      if (typeof value === 'string') {
        candidates.push(value);
      }
    });
  }

  const normalized = candidates
    .filter(Boolean)
    .map(value => value.toString().toLowerCase());

  if (normalized.some(value => /upgrade|boost|perk/.test(value))) {
    return 'upgrade';
  }
  if (normalized.some(value => /study|learn|course|train|class/.test(value))) {
    return 'study';
  }
  if (normalized.some(value => /upkeep|maint|support|care|assist|routine/.test(value))) {
    return 'upkeep';
  }
  if (normalized.some(value => /contract|hustle|work|project|gig/.test(value))) {
    return 'contract';
  }
  return 'other';
}

function formatHourLabel(hour) {
  const normalized = ((hour % 24) + 24) % 24;
  let whole = Math.floor(normalized);
  let minutes = Math.round((normalized - whole) * 60);
  if (minutes === 60) {
    minutes = 0;
    whole = (whole + 1) % 24;
  }
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `${whole.toString().padStart(2, '0')}:${paddedMinutes}`;
}

function getCurrentHour(now = new Date()) {
  if (!(now instanceof Date)) {
    return DAY_START_HOUR;
  }
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  return hours + minutes / 60 + seconds / 3600;
}

function computeHourMarkers(step = 2) {
  const markers = [];
  for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour += step) {
    const percent = ((hour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;
    markers.push({
      hour,
      label: formatHourLabel(hour),
      percent
    });
  }
  return markers;
}

function multiplyDuration(entry) {
  const count = Number.isFinite(entry?.count) && entry.count > 1 ? entry.count : 1;
  return normalizeDuration(entry?.durationHours, MIN_SEGMENT_HOURS) * count;
}

function createSegments({ completed = [], pending = [], hoursSpent = null }) {
  const segments = [];
  const normalizedSpent = Number.isFinite(hoursSpent)
    ? clamp(hoursSpent, 0, TOTAL_DAY_HOURS)
    : null;

  let consumed = 0;

  const addSegment = segment => {
    const startOffset = clamp(segment.start - DAY_START_HOUR, 0, TOTAL_DAY_HOURS);
    const endOffset = clamp(segment.end - DAY_START_HOUR, 0, TOTAL_DAY_HOURS);
    const width = Math.max(0, endOffset - startOffset);
    if (width <= 0) {
      return;
    }

    const widthPercent = (width / TOTAL_DAY_HOURS) * 100;
    const startPercent = (startOffset / TOTAL_DAY_HOURS) * 100;

    segments.push({
      ...segment,
      width,
      widthPercent,
      startPercent
    });
  };

  const effectiveSpent = normalizedSpent ?? completed.reduce((sum, entry) => sum + multiplyDuration(entry), 0);
  const spentTarget = clamp(effectiveSpent, 0, TOTAL_DAY_HOURS);

  const sortedCompleted = [...completed].sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
  sortedCompleted.forEach(entry => {
    if (consumed >= spentTarget) {
      return;
    }
    const duration = multiplyDuration(entry);
    const remaining = spentTarget - consumed;
    const segmentDuration = Math.min(duration, remaining);
    if (segmentDuration <= 0) {
      return;
    }
    const start = DAY_START_HOUR + consumed;
    const end = start + segmentDuration;
    consumed += segmentDuration;
    addSegment({
      id: entry.id,
      title: entry.title || 'Completed task',
      meta: entry.durationText || formatDurationLabel(segmentDuration),
      duration: segmentDuration,
      start,
      end,
      state: 'past',
      category: resolveCategory(entry)
    });
  });

  if (spentTarget - consumed > 0.01) {
    const fillerDuration = spentTarget - consumed;
    const start = DAY_START_HOUR + consumed;
    const end = start + fillerDuration;
    addSegment({
      id: 'focus-buffer',
      title: 'Focus buffer',
      meta: `${formatDurationLabel(fillerDuration)} logged`,
      duration: fillerDuration,
      start,
      end,
      state: 'past',
      category: 'other',
      isBuffer: true
    });
    consumed = spentTarget;
  }

  let futurePointer = DAY_START_HOUR + spentTarget;
  const sortedPending = [...pending];

  sortedPending.forEach(entry => {
    if (futurePointer >= DAY_END_HOUR) {
      return;
    }
    const duration = normalizeDuration(entry?.durationHours || entry?.timeCost, MIN_SEGMENT_HOURS);
    const start = futurePointer;
    const end = Math.min(DAY_END_HOUR, start + duration);
    futurePointer = end;

    const durationLabel = entry.durationText || formatDurationLabel(duration);
    addSegment({
      id: entry.id,
      title: entry.title || 'Scheduled task',
      meta: [durationLabel, entry.payoutText || entry.payoutLabel].filter(Boolean).join(' • '),
      duration,
      start,
      end,
      state: 'future',
      category: resolveCategory(entry),
      entry
    });
  });

  if (futurePointer < DAY_END_HOUR) {
    addSegment({
      id: 'open-planning',
      title: 'Plan later',
      meta: `Opens at ${formatHourLabel(futurePointer)}`,
      duration: DAY_END_HOUR - futurePointer,
      start: futurePointer,
      end: DAY_END_HOUR,
      state: 'future',
      category: 'other',
      isOpen: true
    });
  }

  return segments;
}

function buildTimelineModel({
  viewModel = {},
  pendingEntries = [],
  completedEntries = [],
  now = new Date()
} = {}) {
  const currentHour = getCurrentHour(now);
  const clampedHour = clamp(currentHour, DAY_START_HOUR, DAY_END_HOUR);
  const nowPercent = ((clampedHour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;

  const hoursSpent = Number(viewModel?.hoursSpent);
  const segments = createSegments({
    completed: completedEntries,
    pending: pendingEntries,
    hoursSpent: Number.isFinite(hoursSpent) ? hoursSpent : null
  });

  let activeIndex = -1;
  segments.forEach((segment, index) => {
    const startThreshold = segment.startPercent;
    const endThreshold = startThreshold + segment.widthPercent;
    const isActive = nowPercent >= startThreshold && nowPercent <= endThreshold;
    if (isActive && activeIndex === -1) {
      activeIndex = index;
    }
  });

  if (activeIndex >= 0) {
    segments[activeIndex].isCurrent = true;
  }

  const firstRunnable = segments.find(segment => segment.state === 'future' && segment.entry && !segment.entry.disabled);

  return {
    startHour: DAY_START_HOUR,
    endHour: DAY_END_HOUR,
    segments,
    nowPercent,
    markers: computeHourMarkers(2),
    nextRunnable: firstRunnable || null
  };
}

function detachTicker(container) {
  const record = tickerRegistry.get(container);
  if (record && typeof record.clear === 'function') {
    record.clear();
  } else if (record?.id && typeof window !== 'undefined') {
    window.clearInterval(record.id);
  }
  tickerRegistry.delete(container);
}

function attachTicker(container, line) {
  if (!container || !line || typeof window === 'undefined') {
    return;
  }

  detachTicker(container);

  const update = () => {
    const nowHour = getCurrentHour(new Date());
    const clampedHour = clamp(nowHour, DAY_START_HOUR, DAY_END_HOUR);
    const percent = ((clampedHour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;
    line.style.setProperty('--todo-timeline-now', `${percent}%`);
  };

  update();

  const userAgent = typeof window !== 'undefined' ? window?.navigator?.userAgent : '';
  const runningInJsdom = typeof userAgent === 'string' && userAgent.toLowerCase().includes('jsdom');

  if (runningInJsdom) {
    tickerRegistry.set(container, {
      id: null,
      clear: () => {}
    });
    return;
  }
  const id = window.setInterval(update, UPDATE_INTERVAL_MS);

  if (id && typeof id.unref === 'function') {
    id.unref();
  }

  tickerRegistry.set(container, {
    id,
    clear: () => window.clearInterval(id)
  });
}

function createBlockNode(segment, options = {}) {
  const block = document.createElement('article');
  block.className = `todo-timeline__block todo-timeline__block--${segment.category}`;
  block.classList.add(`is-${segment.state}`);
  if (segment.isCurrent) {
    block.classList.add('is-current');
  }
  if (segment.isBuffer || segment.isOpen) {
    block.classList.add('is-placeholder');
  }
  block.style.setProperty('--todo-timeline-start', `${segment.startPercent}%`);
  block.style.setProperty('--todo-timeline-width', `${segment.widthPercent}%`);
  block.setAttribute('data-task-type', segment.category);
  block.setAttribute('data-task-state', segment.state);
  const labelParts = [segment.title, segment.meta].filter(Boolean).join(' — ');
  block.setAttribute('aria-label', labelParts);
  block.title = labelParts;

  const title = document.createElement('h4');
  title.className = 'todo-timeline__block-title';
  title.textContent = segment.title;
  block.appendChild(title);

  if (segment.meta) {
    const meta = document.createElement('p');
    meta.className = 'todo-timeline__block-meta';
    meta.textContent = segment.meta;
    block.appendChild(meta);
  }

  if (segment.entry && segment === options.nextRunnable) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'todo-timeline__block-action';
    button.textContent = segment.entry.buttonLabel || 'Do now';
    if (typeof options.onRun === 'function') {
      button.addEventListener('click', () => {
        options.onRun(segment.entry);
      });
    }
    block.appendChild(button);
  }

  return block;
}

function renderTimeline(container, model = {}, options = {}) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const scroller = document.createElement('div');
  scroller.className = 'todo-timeline__scroller';
  container.appendChild(scroller);

  const timeline = document.createElement('div');
  timeline.className = 'todo-timeline__track';
  scroller.appendChild(timeline);

  const markers = document.createElement('ul');
  markers.className = 'todo-timeline__markers';
  const markerList = Array.isArray(model.markers) ? model.markers : [];
  markerList.forEach(marker => {
    const item = document.createElement('li');
    item.className = 'todo-timeline__marker';
    item.style.setProperty('--todo-timeline-marker', `${marker.percent}%`);
    item.textContent = marker.label;
    markers.appendChild(item);
  });
  timeline.appendChild(markers);

  const grid = document.createElement('div');
  grid.className = 'todo-timeline__grid';
  timeline.appendChild(grid);

  const blocksLayer = document.createElement('div');
  blocksLayer.className = 'todo-timeline__blocks';
  timeline.appendChild(blocksLayer);

  const segments = Array.isArray(model.segments) ? model.segments : [];
  segments.forEach(segment => {
    const node = createBlockNode(segment, {
      nextRunnable: model.nextRunnable,
      onRun: options.onRun
    });
    blocksLayer.appendChild(node);
  });

  const nowLine = document.createElement('div');
  nowLine.className = 'todo-timeline__now';
  const initialPercent = Number.isFinite(model.nowPercent) ? model.nowPercent : 0;
  nowLine.style.setProperty('--todo-timeline-now', `${initialPercent}%`);
  timeline.appendChild(nowLine);

  const hooks = document.createElement('div');
  hooks.className = 'todo-timeline__hooks';
  hooks.innerHTML = `
    <span class="todo-timeline__hook todo-timeline__hook--recurring" aria-hidden="true"></span>
    <span class="todo-timeline__hook todo-timeline__hook--drag" aria-hidden="true"></span>
    <span class="todo-timeline__hook todo-timeline__hook--bulk" aria-hidden="true"></span>
  `;
  timeline.appendChild(hooks);

  if (!segments.length) {
    const empty = document.createElement('p');
    empty.className = 'todo-timeline__empty';
    empty.textContent = 'Timeline warms up once you log or queue tasks for today.';
    scroller.appendChild(empty);
  }

  attachTicker(container, nowLine);
}

function teardownTimeline(container) {
  if (!container) return;
  detachTicker(container);
}

export {
  buildTimelineModel,
  renderTimeline,
  teardownTimeline,
  formatHourLabel
};

export default {
  buildTimelineModel,
  renderTimeline,
  teardownTimeline
};
