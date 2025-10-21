import { formatHours } from '../../../../../../core/helpers.js';
import { createBreakdownList, createSummaryList } from '../components/lists.js';

const MAX_STREAK_DOTS = 7;

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function createGauge({ title, value, percent, annotation, role }) {
  const gauge = document.createElement('section');
  gauge.className = 'timodoro-gauge';
  if (role) {
    gauge.dataset.role = role;
  }

  const ring = document.createElement('div');
  ring.className = 'timodoro-gauge__ring';
  const normalized = clampPercent(percent);
  ring.style.setProperty('--percent', normalized.toFixed(4));

  const center = document.createElement('div');
  center.className = 'timodoro-gauge__center';

  const valueLabel = document.createElement('span');
  valueLabel.className = 'timodoro-gauge__value';
  valueLabel.textContent = value ?? '';

  const titleLabel = document.createElement('span');
  titleLabel.className = 'timodoro-gauge__title';
  titleLabel.textContent = title ?? '';

  center.append(valueLabel, titleLabel);
  ring.appendChild(center);
  gauge.appendChild(ring);

  if (annotation) {
    const note = document.createElement('p');
    note.className = 'timodoro-gauge__note';
    note.textContent = annotation;
    gauge.appendChild(note);
  }

  return gauge;
}

function createFuelGauge(model = {}) {
  const totalCapacity = Number.isFinite(model.timeCap) && model.timeCap > 0
    ? model.timeCap
    : (Number(model.hoursSpent) || 0) + (Number(model.hoursAvailable) || 0);
  const available = Math.max(0, Number(model.hoursAvailable) || 0);
  const percent = totalCapacity > 0 ? available / totalCapacity : 0;
  const annotation = totalCapacity > 0
    ? `${formatHours(totalCapacity)} daily cap`
    : 'Set a cap to pace your flow.';

  return createGauge({
    title: 'Fuel left',
    value: model.hoursAvailableLabel || formatHours(available),
    percent,
    annotation,
    role: 'timodoro-fuel-gauge'
  });
}

function createFocusGauge(model = {}) {
  const totalCapacity = Number.isFinite(model.timeCap) && model.timeCap > 0
    ? model.timeCap
    : (Number(model.hoursSpent) || 0) + (Number(model.hoursAvailable) || 0);
  const spent = Math.max(0, Number(model.hoursSpent) || 0);
  const percent = totalCapacity > 0 ? spent / totalCapacity : 0;
  const annotation = spent > 0
    ? `Logged ${formatHours(spent)} so far`
    : 'Your first session unlocks the chart.';

  return createGauge({
    title: 'Focus logged',
    value: model.hoursSpentLabel || formatHours(spent),
    percent,
    annotation,
    role: 'timodoro-focus-gauge'
  });
}

function createStreakTrail(model = {}) {
  const streakSection = document.createElement('section');
  streakSection.className = 'timodoro-streak';
  streakSection.dataset.role = 'timodoro-streak-trail';

  const heading = document.createElement('h3');
  heading.className = 'timodoro-streak__title';
  heading.textContent = 'Flow streak';

  const dotsWrapper = document.createElement('div');
  dotsWrapper.className = 'timodoro-streak__dots';

  const streakDays = Math.max(0, Number(model.focusStreakDays) || 0);
  const litDots = Math.min(MAX_STREAK_DOTS, streakDays);

  for (let index = 0; index < MAX_STREAK_DOTS; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'timodoro-streak__dot';
    if (index < litDots) {
      dot.classList.add('is-lit');
    }
    dotsWrapper.appendChild(dot);
  }

  const caption = document.createElement('p');
  caption.className = 'timodoro-streak__caption';
  caption.textContent = model.focusStreakLabel
    || 'Kick off a streak with today’s first session.';

  streakSection.append(heading, dotsWrapper, caption);
  return streakSection;
}

function createSentimentLine(model = {}) {
  const streakDays = Math.max(0, Number(model.focusStreakDays) || 0);
  let message;
  if (streakDays >= 3) {
    message = `You’ve been consistent for ${streakDays} day${streakDays === 1 ? '' : 's'} — keep it flowing.`;
  } else if (streakDays === 2) {
    message = 'Momentum is building — line up today’s groove.';
  } else if (streakDays === 1) {
    message = 'Yesterday sparked a streak — keep the rhythm alive.';
  } else {
    message = 'Your day is unwritten — start with a session that feels right.';
  }

  const sentiment = document.createElement('p');
  sentiment.className = 'timodoro-pulse-panel__sentiment';
  sentiment.textContent = message;
  return sentiment;
}

function createDetailsSection(model = {}) {
  const details = document.createElement('details');
  details.className = 'timodoro-pulse-panel__details';

  const summary = document.createElement('summary');
  summary.textContent = 'Daily breakdown';

  const summaryList = createSummaryList(Array.isArray(model.summaryEntries) ? model.summaryEntries : []);
  const breakdownList = createBreakdownList(Array.isArray(model.breakdownEntries) ? model.breakdownEntries : []);

  details.append(summary, summaryList, breakdownList);
  return details;
}

export function createDailyPulsePanel(model = {}) {
  const panel = document.createElement('aside');
  panel.className = 'timodoro-pulse-panel';

  panel.append(
    createSentimentLine(model),
    createFuelGauge(model),
    createFocusGauge(model),
    createStreakTrail(model),
    createDetailsSection(model)
  );

  return panel;
}

export default {
  createDailyPulsePanel
};
