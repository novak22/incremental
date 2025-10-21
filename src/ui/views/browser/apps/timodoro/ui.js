import { buildQueueEntryModel } from '../../../../actions/models.js';
import { createDailyPulsePanel } from './sections/summarySection.js';
import { createFocusWorkspace, buildTodoGroups } from './sections/todoSection.js';

const animationLoopMap = new WeakMap();
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TOTAL_MINUTES = 24 * 60;

function stopAnalogLoop(target) {
  if (!target) {
    return;
  }
  const cancel = animationLoopMap.get(target);
  if (typeof cancel === 'function') {
    cancel();
  }
  animationLoopMap.delete(target);
}

function formatTimeLabelFromMinutes(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours24 = Math.floor(total / 60);
  const mins = total % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${suffix}`;
}

function toTimestamp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric > 1e12) {
    return numeric;
  }
  if (numeric > 1e9) {
    return Math.round(numeric * 1000);
  }
  return null;
}

function normalizeDurationMinutes(entry, fallbackMinutes = 30) {
  const durationHours = Number(entry?.durationHours);
  if (Number.isFinite(durationHours) && durationHours > 0) {
    return Math.max(fallbackMinutes, Math.round(durationHours * 60));
  }
  if (typeof entry?.durationText === 'string') {
    const match = entry.durationText.match(/(\d+(?:\.\d+)?)\s*h/);
    if (match) {
      const hours = Number(match[1]);
      if (Number.isFinite(hours) && hours > 0) {
        return Math.max(fallbackMinutes, Math.round(hours * 60));
      }
    }
  }
  return fallbackMinutes;
}

function buildTimelineData(model = {}, todoGroups = {}) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();
  const endMs = startMs + DAY_IN_MS;

  const capsules = [];

  const completed = Array.isArray(model?.timelineCompletedEntries)
    ? [...model.timelineCompletedEntries]
    : [];
  completed.sort((a, b) => {
    const timeA = Number(a?.completedAt);
    const timeB = Number(b?.completedAt);
    if (Number.isFinite(timeA) && Number.isFinite(timeB)) {
      return timeA - timeB;
    }
    if (Number.isFinite(timeA)) return -1;
    if (Number.isFinite(timeB)) return 1;
    return 0;
  });

  let pointerMs = startMs;

  completed.forEach(entry => {
    if (!entry) {
      return;
    }
    const durationMinutes = normalizeDurationMinutes(entry, 25);
    let end = toTimestamp(entry.completedAt);
    if (!Number.isFinite(end)) {
      end = pointerMs + durationMinutes * 60 * 1000;
    }
    let start = end - durationMinutes * 60 * 1000;
    if (!Number.isFinite(start)) {
      start = pointerMs;
    }
    start = Math.max(start, startMs);
    end = Math.min(Math.max(end, start + 15 * 60 * 1000), endMs);
    pointerMs = Math.max(pointerMs, end);

    const startMinutes = Math.max(0, Math.round((start - startMs) / 60000));
    const endMinutes = Math.max(startMinutes + 15, Math.round((end - startMs) / 60000));

    capsules.push({
      id: entry.id || `completed:${capsules.length}`,
      title: entry.title || 'Completed focus block',
      status: 'completed',
      startMinutes,
      endMinutes,
      durationMinutes,
      entry
    });
  });

  const pendingEntries = Array.isArray(todoGroups?.grouping?.entries)
    ? todoGroups.grouping.entries.map(entry => buildQueueEntryModel(entry))
    : [];

  let projectedStartMs = Math.max(pointerMs, now.getTime());

  pendingEntries.forEach((entry, index) => {
    if (!entry) {
      return;
    }
    const durationMinutes = normalizeDurationMinutes(entry, 30);
    const start = Math.min(Math.max(projectedStartMs, startMs), endMs - 15 * 60 * 1000);
    const end = Math.min(start + durationMinutes * 60 * 1000, endMs);
    projectedStartMs = end;

    const startMinutes = Math.max(0, Math.round((start - startMs) / 60000));
    const endMinutes = Math.max(startMinutes + 15, Math.round((end - startMs) / 60000));

    capsules.push({
      id: entry.id || `pending:${index}`,
      title: entry.title || 'Upcoming focus',
      status: index === 0 ? 'active' : 'upcoming',
      startMinutes,
      endMinutes,
      durationMinutes,
      entry
    });
  });

  return {
    capsules,
    startMs,
    endMs
  };
}

function updateCapsulePosition(element, data) {
  if (!element || !data) {
    return;
  }
  const spanMinutes = Math.max(1, data.endMinutes - data.startMinutes);
  const startPercent = (data.startMinutes / TOTAL_MINUTES) * 100;
  const spanPercent = (spanMinutes / TOTAL_MINUTES) * 100;
  element.style.setProperty('--start-percent', startPercent.toFixed(3));
  element.style.setProperty('--span-percent', spanPercent.toFixed(3));

  const startLabel = formatTimeLabelFromMinutes(data.startMinutes);
  const endLabel = formatTimeLabelFromMinutes(data.endMinutes);
  const timeLabel = element.querySelector?.('.timodoro-capsule__time');
  if (timeLabel) {
    timeLabel.textContent = `${startLabel} — ${endLabel}`;
  }
  element.dataset.startLabel = startLabel;
  element.dataset.endLabel = endLabel;
}

function enableDrag(element, data, context) {
  if (!element || !data || !context) {
    return;
  }

  element.addEventListener('pointerdown', event => {
    if (event.button !== 0 || data.status === 'completed') {
      return;
    }
    const ribbonRect = context.ribbon.getBoundingClientRect();
    if (!ribbonRect || ribbonRect.width <= 0) {
      return;
    }
    event.preventDefault();
    element.setPointerCapture(event.pointerId);

    const initialStart = data.startMinutes;
    const startX = event.clientX;

    const handleMove = moveEvent => {
      const deltaX = moveEvent.clientX - startX;
      const deltaMinutes = (deltaX / ribbonRect.width) * TOTAL_MINUTES;
      let nextStart = initialStart + deltaMinutes;
      nextStart = Math.round(nextStart / 30) * 30;
      nextStart = Math.min(Math.max(nextStart, 0), TOTAL_MINUTES - Math.max(30, data.durationMinutes));
      data.startMinutes = nextStart;
      data.endMinutes = nextStart + Math.max(30, data.durationMinutes);
      updateCapsulePosition(element, data);
    };

    const handleUp = upEvent => {
      element.releasePointerCapture(event.pointerId);
      element.removeEventListener('pointermove', handleMove);
      element.removeEventListener('pointerup', handleUp);
      element.removeEventListener('pointercancel', handleUp);
    };

    element.addEventListener('pointermove', handleMove);
    element.addEventListener('pointerup', handleUp);
    element.addEventListener('pointercancel', handleUp);
  });
}

function createCapsuleElement(data, context) {
  const capsule = document.createElement('button');
  capsule.type = 'button';
  capsule.className = 'timodoro-capsule';
  capsule.dataset.status = data.status;
  capsule.setAttribute('aria-label', `${data.title} (${formatTimeLabelFromMinutes(data.startMinutes)} to ${formatTimeLabelFromMinutes(data.endMinutes)})`);

  const time = document.createElement('span');
  time.className = 'timodoro-capsule__time';
  time.textContent = `${formatTimeLabelFromMinutes(data.startMinutes)} — ${formatTimeLabelFromMinutes(data.endMinutes)}`;

  const title = document.createElement('span');
  title.className = 'timodoro-capsule__title';
  title.textContent = data.title;

  capsule.append(time, title);

  if (data.entry && typeof data.entry.onClick === 'function') {
    capsule.addEventListener('click', event => {
      event.preventDefault();
      data.entry.onClick?.();
    });
  } else {
    capsule.disabled = data.status === 'completed';
  }

  updateCapsulePosition(capsule, data);
  enableDrag(capsule, data, context);

  return capsule;
}

function createTemporalCanvas(model = {}, todoGroups = {}, options = {}) {
  const { capsules, startMs, endMs } = buildTimelineData(model, todoGroups);

  const canvas = document.createElement('section');
  canvas.className = 'timodoro-canvas';
  canvas.setAttribute('aria-label', 'Temporal focus canvas');

  const ribbonWrapper = document.createElement('div');
  ribbonWrapper.className = 'timodoro-canvas__ribbon-wrapper';

  const ribbon = document.createElement('div');
  ribbon.className = 'timodoro-canvas__ribbon';
  ribbonWrapper.appendChild(ribbon);

  const capsuleData = [];

  capsules.forEach(capsule => {
    const element = createCapsuleElement(capsule, { ribbon });
    ribbon.appendChild(element);
    capsuleData.push({ ...capsule, element });
  });

  const nowMarker = document.createElement('div');
  nowMarker.className = 'timodoro-canvas__now';
  nowMarker.setAttribute('aria-hidden', 'true');

  canvas.append(ribbonWrapper, nowMarker);

  return {
    element: canvas,
    context: {
      container: canvas,
      ribbon,
      nowMarker,
      capsules: capsuleData,
      startMs,
      endMs
    }
  };
}

function updateDayProgress(root) {
  if (!root) {
    return;
  }
  const now = Date.now();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const progress = (now - start.getTime()) / DAY_IN_MS;
  root.style.setProperty('--day-progress', Math.min(1, Math.max(0, progress)).toFixed(4));
}

function updateTimelineNow(context) {
  if (!context) {
    return;
  }
  const now = Date.now();
  const progress = (now - context.startMs) / (context.endMs - context.startMs);
  const clamped = Math.min(1, Math.max(0, progress));
  context.container.style.setProperty('--now-progress', clamped.toFixed(4));

  context.capsules.forEach(capsule => {
    if (!capsule?.element) {
      return;
    }
    const startRatio = capsule.startMinutes / TOTAL_MINUTES;
    const endRatio = capsule.endMinutes / TOTAL_MINUTES;
    const isActive = clamped >= startRatio && clamped <= endRatio && capsule.status !== 'completed';
    capsule.element.classList.toggle('is-active', isActive);
  });
}

function startAnalogLoop(target, timelineContext) {
  if (!target) {
    return;
  }
  stopAnalogLoop(target);

  updateDayProgress(target);
  updateTimelineNow(timelineContext);

  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return;
  }

  let frameId = null;

  const step = () => {
    updateDayProgress(target);
    updateTimelineNow(timelineContext);
    frameId = window.requestAnimationFrame(step);
  };

  frameId = window.requestAnimationFrame(step);
  animationLoopMap.set(target, () => {
    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
    }
  });
}

function render(model = {}, context = {}) {
  const { mount } = context;
  const summary = { meta: model?.meta || 'Productivity ready', urlPath: 'flow' };

  if (!mount) {
    return summary;
  }

  stopAnalogLoop(mount);

  mount.innerHTML = '';
  mount.className = 'timodoro timodoro--flow';
  mount.dataset.role = mount.dataset.role || 'timodoro-root';

  const entries = Array.isArray(model.todoEntries) ? model.todoEntries : [];
  const todoGroups = buildTodoGroups(entries, {
    availableHours: model.todoHoursAvailable ?? model.hoursAvailable,
    availableMoney: model.todoMoneyAvailable ?? model.moneyAvailable,
    emptyMessage: model.todoEmptyMessage
  });

  const { workspace } = createFocusWorkspace(model, { todoGroups });
  const { element: canvas, context: timelineContext } = createTemporalCanvas(model, todoGroups);
  const pulsePanel = createDailyPulsePanel(model);

  const body = document.createElement('div');
  body.className = 'timodoro__body';

  const mainColumn = document.createElement('div');
  mainColumn.className = 'timodoro__main';
  mainColumn.appendChild(workspace);

  body.append(mainColumn, pulsePanel);

  mount.append(canvas, body);

  startAnalogLoop(mount, timelineContext);

  return summary;
}

export { render };
export default { render };
