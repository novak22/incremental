import { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import { formatDays, formatHours, formatMoney } from '../../../core/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../../game/requirements.js';
import { resolveTrack } from '../../cards/model.js';
import { createBadge } from './components/badge.js';
import { createDefinitionSummary } from './components/definitionSummary.js';
import { showSlideOver } from './components/slideOver.js';

const studyUi = new Map();
let educationModelCache = null;

export function cacheEducationModels(models) {
  educationModelCache = models ?? null;
}

function ensureEducationModels(models) {
  if (models !== undefined) {
    cacheEducationModels(models);
  }
  return educationModelCache;
}

function describeSkillWeight(weight = 0) {
  if (weight >= 0.75) return 'Signature focus';
  if (weight >= 0.5) return 'Core boost';
  if (weight >= 0.3) return 'Supporting practice';
  return 'Quick primer';
}

function formatStudyCountdown(trackInfo, progress) {
  if (progress.completed) {
    return 'Diploma earned';
  }

  const totalDays = Math.max(0, Number(progress.totalDays ?? trackInfo.days ?? 0));
  if (!progress.enrolled) {
    return `${formatDays(totalDays || trackInfo.days)}`;
  }

  const completedDays = Math.max(0, Math.min(totalDays, Number(progress.daysCompleted) || 0));
  const remainingDays = Math.max(0, totalDays - completedDays);
  if (remainingDays === 0) {
    return 'Graduation tomorrow';
  }
  if (remainingDays === 1) {
    return '1 day remaining';
  }
  return `${remainingDays} days remaining`;
}

function describeStudyMomentum(trackInfo, progress) {
  if (progress.completed) {
    return 'Knowledge unlocked for every requirement. Toast your success!';
  }
  if (!progress.enrolled) {
    const tuitionNote = trackInfo.tuition > 0 ? `Pay $${formatMoney(trackInfo.tuition)} upfront and` : 'Just';
    return `${tuitionNote} we’ll reserve ${formatHours(trackInfo.hoursPerDay)} each day once you enroll.`;
  }
  if (progress.studiedToday) {
    return '✅ Today’s session is logged. Keep the streak cozy until sundown.';
  }
  return `Reserve ${formatHours(trackInfo.hoursPerDay)} today to keep momentum humming.`;
}

function buildStudyBadges(progress) {
  const badges = [];
  if (progress.completed) {
    badges.push(createBadge('Graduated'));
  } else if (progress.enrolled) {
    badges.push(createBadge('Enrolled'));
    badges.push(createBadge(progress.studiedToday ? 'Logged today' : 'Study pending'));
  } else {
    badges.push(createBadge('Ready to enroll'));
  }
  return badges;
}

function applyStudyTrackState(track, trackInfo, progress) {
  track.dataset.active = progress.enrolled ? 'true' : 'false';
  track.dataset.complete = progress.completed ? 'true' : 'false';

  const countdown = track.querySelector('.study-track__countdown');
  if (countdown) {
    countdown.textContent = formatStudyCountdown(trackInfo, progress);
  }

  const status = track.querySelector('.study-track__status');
  if (status) {
    status.innerHTML = '';
    buildStudyBadges(progress).forEach(badge => status.appendChild(badge));
  }

  const note = track.querySelector('.study-track__note');
  if (note) {
    note.textContent = describeStudyMomentum(trackInfo, progress);
  }

  const totalDays = Math.max(0, Number(progress.totalDays ?? trackInfo.days ?? 0));
  const completedDays = progress.completed
    ? totalDays
    : Math.max(0, Math.min(totalDays, Number(progress.daysCompleted) || 0));
  const remainingDays = Math.max(0, totalDays - completedDays);
  const percent = Math.min(
    100,
    Math.max(0, Math.round((totalDays === 0 ? (progress.completed ? 1 : 0) : completedDays / totalDays) * 100))
  );
  const fill = track.querySelector('.study-track__progress span');
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.setAttribute('aria-valuenow', String(percent));
  }

  const progressLabel = track.querySelector('.study-track__progress');
  if (progressLabel) {
    progressLabel.setAttribute('aria-label', `${trackInfo.name} progress: ${percent}%`);
  }

  const remaining = track.querySelector('.study-track__remaining');
  if (remaining) {
    const totalLabel = totalDays || trackInfo.days;
    remaining.textContent = `${completedDays}/${totalLabel} days complete`;
  }

  const countdownValue = track.querySelector('.study-track__remaining-days');
  if (countdownValue) {
    countdownValue.textContent = progress.completed
      ? 'Course complete'
      : remainingDays === 1
        ? '1 day left'
        : `${remainingDays} days left`;
  }
}

function openStudyDetails(definition) {
  const body = document.createElement('div');
  body.className = 'study-detail';
  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }
  body.appendChild(
    createDefinitionSummary('Per-level bonuses', (definition.levels || []).map(level => ({
      label: `Level ${level.level}`,
      value: level.name
    })))
  );
  showSlideOver({ eyebrow: 'Study track', title: definition.name, body });
}

function renderStudyTrack(definition) {
  const state = getState();
  const trackInfo = resolveTrack(definition);
  const progress = getKnowledgeProgress(trackInfo.id, state);
  const track = document.createElement('article');
  track.className = 'study-track';
  track.dataset.track = trackInfo.id;
  track.setAttribute('aria-label', `${trackInfo.name} study track`);

  const header = document.createElement('header');
  header.className = 'study-track__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'study-track__title-group';

  const title = document.createElement('h3');
  title.textContent = trackInfo.name;
  titleGroup.appendChild(title);
  const status = document.createElement('div');
  status.className = 'study-track__status badges';
  titleGroup.appendChild(status);
  header.appendChild(titleGroup);

  const countdown = document.createElement('span');
  countdown.className = 'study-track__countdown';
  header.appendChild(countdown);

  track.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'study-track__summary';
  summary.textContent = trackInfo.summary || '';
  track.appendChild(summary);

  const meta = document.createElement('dl');
  meta.className = 'study-track__meta';
  const metaItems = [
    { label: 'Daily load', value: `${formatHours(trackInfo.hoursPerDay)} / day` },
    { label: 'Course length', value: formatDays(trackInfo.days) },
    { label: 'Tuition', value: trackInfo.tuition > 0 ? `$${formatMoney(trackInfo.tuition)}` : 'Free' }
  ];
  metaItems.forEach(item => {
    const dt = document.createElement('dt');
    dt.textContent = item.label;
    meta.appendChild(dt);
    const dd = document.createElement('dd');
    dd.textContent = item.value;
    meta.appendChild(dd);
  });
  track.appendChild(meta);

  if (trackInfo.skills.length) {
    const skills = document.createElement('section');
    skills.className = 'study-track__skills';

    const heading = document.createElement('h4');
    heading.className = 'study-track__skills-heading';
    heading.textContent = 'Skill rewards';
    skills.appendChild(heading);

    if (trackInfo.skillXp > 0) {
      const xpNote = document.createElement('p');
      xpNote.className = 'study-track__skills-note';
      xpNote.textContent = `Graduates collect +${trackInfo.skillXp} XP across these disciplines.`;
      skills.appendChild(xpNote);
    }

    const list = document.createElement('ul');
    list.className = 'study-track__skills-list';
    trackInfo.skills.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'study-track__skills-item';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      item.appendChild(name);
      const note = document.createElement('span');
      note.textContent = describeSkillWeight(entry.weight);
      item.appendChild(note);
      list.appendChild(item);
    });
    skills.appendChild(list);
    track.appendChild(skills);
  }

  const progressWrap = document.createElement('div');
  progressWrap.className = 'study-track__progress-wrap';

  const remaining = document.createElement('span');
  remaining.className = 'study-track__remaining';
  progressWrap.appendChild(remaining);

  const bar = document.createElement('div');
  bar.className = 'study-track__progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('span');
  bar.appendChild(fill);
  progressWrap.appendChild(bar);

  const remainingDays = document.createElement('span');
  remainingDays.className = 'study-track__remaining-days';
  progressWrap.appendChild(remainingDays);
  track.appendChild(progressWrap);

  const note = document.createElement('p');
  note.className = 'study-track__note';
  track.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'hustle-card__actions';
  if (trackInfo.action?.onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = typeof trackInfo.action.label === 'function'
      ? trackInfo.action.label(state)
      : trackInfo.action.label || 'Study';
    button.addEventListener('click', () => trackInfo.action.onClick());
    actions.appendChild(button);
  }
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'ghost';
  details.textContent = 'Details';
  details.addEventListener('click', () => openStudyDetails(trackInfo));
  actions.appendChild(details);
  track.appendChild(actions);

  applyStudyTrackState(track, trackInfo, progress);

  return { track };
}

function renderStudyQueue(educationModels) {
  const models = ensureEducationModels(educationModels);
  const { list: queue, eta: queueEta, cap: capNode } = getElement('studyQueue') || {};
  if (!queue) return;
  queue.innerHTML = '';
  const queueModel = models?.queue;
  (queueModel?.entries ?? []).forEach(entry => {
    const item = document.createElement('li');
    item.textContent = `${entry.name} • ${formatHours(entry.hoursPerDay)} per day`;
    queue.appendChild(item);
  });
  if (!queue.childElementCount) {
    const empty = document.createElement('li');
    empty.textContent = 'No study queued today.';
    queue.appendChild(empty);
  }
  if (queueEta) {
    queueEta.textContent = queueModel?.totalLabel || '';
  }

  if (capNode) {
    capNode.textContent = queueModel?.capLabel || '';
  }
}

export function renderStudySection(definitions, educationModels) {
  const list = getElement('studyTrackList');
  if (!list) return;
  ensureEducationModels(educationModels);
  list.innerHTML = '';
  studyUi.clear();
  definitions.forEach(def => {
    if (!isStudyDefinition(def)) return;
    const { track } = renderStudyTrack(def);
    list.appendChild(track);
    studyUi.set(resolveTrack(def).id, { track });
  });
  renderStudyQueue();
}

export function isStudyDefinition(definition) {
  if (!definition) return false;
  return definition.tag?.type === 'study' || Boolean(KNOWLEDGE_TRACKS[definition.id]);
}

export function updateStudyTrack(definition) {
  if (!isStudyDefinition(definition)) return;
  const info = resolveTrack(definition);
  const ui = studyUi.get(info.id);
  if (!ui) return;
  const state = getState();
  const progress = getKnowledgeProgress(info.id, state);
  applyStudyTrackState(ui.track, info, progress);
}

export function updateStudySection(definitions, educationModels) {
  ensureEducationModels(educationModels);
  definitions.forEach(def => {
    if (isStudyDefinition(def)) {
      updateStudyTrack(def);
    }
  });
  renderStudyQueue();
}

export function getCachedEducationModels() {
  return educationModelCache;
}

const studySection = {
  cacheEducationModels,
  renderStudySection,
  updateStudySection,
  updateStudyTrack,
  isStudyDefinition,
  getCachedEducationModels
};

export default studySection;
