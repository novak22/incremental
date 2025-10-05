import { formatHours } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../game/requirements.js';
import { registerActionProvider, collectOutstandingActionEntries } from '../actions/registry.js';

export function computeStudyProgress(state = {}) {
  const tracks = Object.values(KNOWLEDGE_TRACKS);
  if (!tracks.length) {
    return { percent: 0, summary: 'No study tracks unlocked yet.' };
  }
  let enrolled = 0;
  let completed = 0;
  let totalProgress = 0;
  tracks.forEach(track => {
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled) return;
    enrolled += 1;
    if (progress.completed) {
      completed += 1;
      totalProgress += 1;
    } else {
      const fraction = Math.min(1, (progress.daysCompleted || 0) / Math.max(1, track.days));
      totalProgress += fraction;
    }
  });
  const percent = enrolled > 0 ? Math.round((totalProgress / Math.max(1, enrolled)) * 100) : 0;
  const summary = enrolled
    ? `${completed}/${enrolled} finished • ${percent}% average progress`
    : 'No active study tracks.';
  return { percent, summary };
}

function resolveStudyTrackIdFromEntry(entry = {}) {
  const definitionId = entry?.definitionId || entry?.progress?.definitionId || '';
  if (typeof entry?.progress?.studyTrackId === 'string' && entry.progress.studyTrackId) {
    return entry.progress.studyTrackId;
  }
  if (typeof entry?.progress?.trackId === 'string' && entry.progress.trackId) {
    return entry.progress.trackId;
  }
  if (typeof definitionId === 'string' && definitionId.startsWith('study-')) {
    return definitionId.slice('study-'.length);
  }
  return null;
}

function buildActiveStudyEntries(state = {}) {
  if (!state || typeof state !== 'object') {
    return [];
  }

  const outstandingEntries = collectOutstandingActionEntries(state) || [];
  const outstandingByTrack = new Map();
  outstandingEntries
    .filter(entry => entry?.progress?.type === 'study'
      || (entry?.definitionId && String(entry.definitionId).startsWith('study-')))
    .forEach(entry => {
      const trackId = resolveStudyTrackIdFromEntry(entry);
      if (!trackId || outstandingByTrack.has(trackId)) {
        return;
      }
      outstandingByTrack.set(trackId, entry);
    });

  const entries = [];

  Object.values(KNOWLEDGE_TRACKS).forEach(track => {
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress?.enrolled || progress?.completed) {
      return;
    }

    const outstanding = outstandingByTrack.get(track.id);
    if (!outstanding || !outstanding?.progress) {
      return;
    }

    const instanceProgress = outstanding.progress || {};
    const hoursPerDay = Math.max(0,
      clampNumber(track.hoursPerDay ?? instanceProgress.hoursPerDay));
    const remainingDays = (() => {
      if (Number.isFinite(instanceProgress.remainingDays)) {
        return Math.max(0, instanceProgress.remainingDays);
      }
      const totalDays = Number(track.days ?? progress.totalDays) || 0;
      const completedDays = Number(progress.daysCompleted) || 0;
      return Math.max(0, totalDays - completedDays);
    })();
    const studiedToday = Boolean(progress.studiedToday);

    const durationHours = Number.isFinite(outstanding.durationHours)
      ? Math.max(0, outstanding.durationHours)
      : Number.isFinite(instanceProgress.stepHours)
        ? Math.max(0, instanceProgress.stepHours)
        : hoursPerDay;
    const durationText = outstanding.durationText || formatHours(durationHours);

    const metaParts = [];
    if (hoursPerDay > 0) {
      metaParts.push(`${formatHours(hoursPerDay)} per day`);
    }
    if (Number.isFinite(remainingDays)) {
      metaParts.push(`${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`);
    }
    if (studiedToday) {
      metaParts.push('Logged today');
    }

    const metaClass = outstanding.metaClass || (
      Number.isFinite(remainingDays)
        ? remainingDays <= 1
          ? 'todo-widget__meta--warning'
          : remainingDays <= 3
            ? 'todo-widget__meta--alert'
            : undefined
        : undefined
    );

    entries.push({
      id: outstanding.id || `instance:${instanceProgress.instanceId || track.id}`,
      title: track.name,
      subtitle: track.description,
      meta: metaParts.join(' • '),
      metaClass,
      buttonLabel: 'Log study session',
      timeCost: durationHours,
      durationHours,
      durationText,
      moneyCost: 0,
      repeatable: true,
      remainingRuns: outstanding.remainingRuns ?? null,
      focusCategory: 'study',
      focusBucket: 'study',
      orderIndex: Number.isFinite(outstanding.orderIndex) ? outstanding.orderIndex : undefined,
      progress: instanceProgress,
      instanceId: outstanding.instanceId || instanceProgress.instanceId || null,
      definitionId: outstanding.definitionId || instanceProgress.definitionId || `study-${track.id}`,
      remainingDays,
      raw: {
        title: track.name,
        subtitle: track.description,
        meta: metaParts.join(' • '),
        metaClass,
        buttonLabel: 'Log study session',
        durationText,
        moneyCost: 0,
        remainingDays,
        hoursPerDay,
        studiedToday,
        trackId: track.id
      }
    });
  });

  entries.sort((a, b) => {
    const daysA = Number.isFinite(a?.remainingDays) ? a.remainingDays : Infinity;
    const daysB = Number.isFinite(b?.remainingDays) ? b.remainingDays : Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    return (a?.title || '').localeCompare(b?.title || '');
  });

  return entries;
}

export function buildStudyEnrollmentActionModel(state = {}) {
  const safeState = state || {};
  const entries = buildActiveStudyEntries(safeState);

  const baseHours = clampNumber(safeState.baseTime) + clampNumber(safeState.bonusTime) + clampNumber(safeState.dailyBonusTime);
  const hoursAvailable = Math.max(0, clampNumber(safeState.timeLeft));
  const hoursSpent = Math.max(0, baseHours - hoursAvailable);

  return {
    entries,
    emptyMessage: 'No active study tracks at the moment. Enroll in a course to add one.',
    moneyAvailable: clampNumber(safeState.money),
    hoursAvailable,
    hoursAvailableLabel: formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: formatHours(hoursSpent)
  };
}

registerActionProvider(({ state }) => {
  const model = buildStudyEnrollmentActionModel(state);
  const entries = (Array.isArray(model?.entries) ? model.entries : []).map((entry, index) => ({
    ...entry,
    meta: [entry?.subtitle, entry?.meta].filter(Boolean).join(' • ') || entry?.meta || '',
    focusCategory: entry?.focusCategory || 'study',
    orderIndex: Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index
  }));

  return {
    id: 'study-enrollment',
    focusCategory: 'study',
    entries,
    metrics: {
      emptyMessage: model?.emptyMessage,
      moneyAvailable: model?.moneyAvailable,
      hoursAvailable: model?.hoursAvailable,
      hoursAvailableLabel: model?.hoursAvailableLabel,
      hoursSpent: model?.hoursSpent,
      hoursSpentLabel: model?.hoursSpentLabel
    }
  };
}, 10);
