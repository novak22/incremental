import { formatHours } from '../../../../core/helpers.js';

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatHoursLabel(hoursLogged, hoursRequired) {
  const logged = safeNumber(hoursLogged) ?? 0;
  const required = safeNumber(hoursRequired);
  if (required != null && required > 0) {
    return `${formatHours(Math.max(0, logged))} logged of ${formatHours(Math.max(0, required))}`;
  }
  if (logged > 0) {
    return `${formatHours(Math.max(0, logged))} logged`;
  }
  return 'No focus logged yet';
}

function createMeterWrapper(kind) {
  const wrapper = document.createElement('div');
  wrapper.className = `commitment-meter commitment-meter--${kind}`;
  return wrapper;
}

function createTrack(percent, tone) {
  const track = document.createElement('div');
  track.className = 'commitment-meter__track';

  const fill = document.createElement('div');
  fill.className = 'commitment-meter__fill';
  if (Number.isFinite(percent)) {
    fill.style.width = `${Math.max(0, Math.min(1, percent)) * 100}%`;
  }
  if (tone) {
    fill.classList.add(`commitment-meter__fill--${tone}`);
  }

  track.appendChild(fill);
  return { track, fill };
}

function describeDeadline(remainingDays) {
  const remaining = safeNumber(remainingDays);
  if (!Number.isFinite(remaining)) return '';
  if (remaining <= 0) return 'Due today';
  if (remaining === 1) return 'Due tomorrow';
  return `${remaining} days remaining`;
}

function resolveDeadlineTone(remainingDays) {
  const remaining = safeNumber(remainingDays);
  if (!Number.isFinite(remaining)) return null;
  if (remaining <= 1) return 'critical';
  if (remaining <= 3) return 'warning';
  return null;
}

function resolveDeadlinePercent(progress = {}) {
  const remainingDays = safeNumber(progress.remainingDays);
  const daysRequired = safeNumber(progress.daysRequired);
  const daysCompleted = safeNumber(progress.daysCompleted);
  const acceptedOnDay = safeNumber(progress.acceptedOnDay);
  const deadlineDay = safeNumber(progress.deadlineDay);

  if (Number.isFinite(daysRequired) && daysRequired > 0) {
    const completed = Math.max(0, Math.min(daysRequired, daysCompleted ?? 0));
    return clampPercent(daysRequired > 0 ? completed / daysRequired : null);
  }

  if (Number.isFinite(remainingDays) && Number.isFinite(deadlineDay) && Number.isFinite(acceptedOnDay)) {
    const totalDays = Math.max(1, deadlineDay - acceptedOnDay + 1);
    const elapsed = Math.max(0, Math.min(totalDays, totalDays - remainingDays));
    return clampPercent(totalDays > 0 ? elapsed / totalDays : null);
  }

  if (Number.isFinite(remainingDays) && Number.isFinite(deadlineDay)) {
    const currentDay = deadlineDay - remainingDays + 1;
    if (Number.isFinite(currentDay) && Number.isFinite(acceptedOnDay)) {
      const totalDays = Math.max(1, deadlineDay - acceptedOnDay + 1);
      const elapsed = Math.max(0, Math.min(totalDays, currentDay - acceptedOnDay));
      return clampPercent(totalDays > 0 ? elapsed / totalDays : null);
    }
  }

  if (Number.isFinite(remainingDays)) {
    const totalDays = Math.max(remainingDays, 1);
    const elapsed = Math.max(0, totalDays - remainingDays);
    return clampPercent(totalDays > 0 ? elapsed / totalDays : null);
  }

  return null;
}

export function createCommitmentTimeline(progress = {}, options = {}) {
  const { showHours = true, showDeadline = true } = options;
  const fragments = [];

  if (showHours) {
    const percent = clampPercent(progress.percentComplete);
    let fallbackPercent = percent;
    if (fallbackPercent == null) {
      const logged = safeNumber(progress.hoursLogged) ?? 0;
      const required = safeNumber(progress.hoursRequired);
      if (Number.isFinite(required) && required > 0) {
        fallbackPercent = clampPercent(required > 0 ? logged / required : null);
      }
    }

    if (fallbackPercent != null || Number.isFinite(progress.hoursLogged)) {
      const wrapper = createMeterWrapper('hours');
      const label = document.createElement('div');
      label.className = 'commitment-meter__label';
      label.textContent = formatHoursLabel(progress.hoursLogged, progress.hoursRequired);
      wrapper.appendChild(label);

      if (fallbackPercent != null) {
        const { track } = createTrack(fallbackPercent);
        wrapper.appendChild(track);
      }

      fragments.push(wrapper);
    }
  }

  if (showDeadline) {
    const percent = resolveDeadlinePercent(progress);
    const deadlineLabel = describeDeadline(progress.remainingDays);
    if (percent != null || deadlineLabel) {
      const tone = resolveDeadlineTone(progress.remainingDays);
      const wrapper = createMeterWrapper('deadline');
      if (tone) {
        wrapper.classList.add(`commitment-meter--${tone}`);
      }

      const label = document.createElement('div');
      label.className = 'commitment-meter__label';
      label.textContent = deadlineLabel || 'Deadline tracking';
      wrapper.appendChild(label);

      if (percent != null) {
        const { track, fill } = createTrack(percent, tone);
        wrapper.appendChild(track);
        if (tone) {
          fill.classList.add(`commitment-meter__fill--${tone}`);
        }
      }

      fragments.push(wrapper);
    }
  }

  if (!fragments.length) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'commitment-timeline';
  fragments.forEach(fragment => container.appendChild(fragment));
  return container;
}

export function applyDeadlineTone(element, progress = {}) {
  if (!element) return;
  const tone = resolveDeadlineTone(progress.remainingDays);
  element.classList.toggle('is-critical', tone === 'critical');
  element.classList.toggle('is-warning', tone === 'warning');
}

export function describeDeadlineLabel(progress = {}) {
  return describeDeadline(progress.remainingDays);
}

