import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { getHustles } from '../../game/registryService.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../game/requirements.js';
import {
  registerActionProvider,
  normalizeActionEntries
} from '../actions/registry.js';

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

function buildStudyEnrollmentSuggestions(state = {}) {
  const suggestions = [];

  if (!state || typeof state !== 'object') {
    return suggestions;
  }

  for (const hustle of getHustles()) {
    if (hustle?.tag?.type !== 'study') continue;
    const action = hustle?.action;
    if (!action?.onClick) continue;

    let disabled = false;
    if (typeof action.disabled === 'function') {
      try {
        disabled = action.disabled(state);
      } catch (error) {
        disabled = true;
      }
    } else {
      disabled = Boolean(action.disabled);
    }
    if (disabled) continue;

    const timeCost = Math.max(0, clampNumber(action.timeCost ?? hustle.time));
    const tuition = Math.max(0, clampNumber(action.moneyCost));
    const metaParts = [];
    if (tuition > 0) {
      metaParts.push(`$${formatMoney(tuition)} tuition`);
    }
    if (timeCost > 0) {
      metaParts.push(`${formatHours(timeCost)} focus`);
    }

    const buttonLabel = typeof action.label === 'function'
      ? action.label(state)
      : action.label || 'Enroll';

    suggestions.push({
      id: hustle.id,
      title: hustle.name,
      subtitle: hustle.description,
      meta: metaParts.join(' • '),
      buttonLabel,
      onClick: action.onClick,
      timeCost,
      durationHours: timeCost,
      durationText: formatHours(timeCost),
      moneyCost: tuition,
      repeatable: false,
      remainingRuns: null
    });
  }

  suggestions.sort((a, b) => a.moneyCost - b.moneyCost);
  return suggestions;
}

export function buildStudyEnrollmentActionModel(state = {}) {
  const safeState = state || {};
  const suggestions = buildStudyEnrollmentSuggestions(safeState);
  const entries = suggestions.map((action, index) => ({
    id: action.id || `study-${index}`,
    title: action.title,
    subtitle: action.subtitle,
    meta: action.meta,
    buttonLabel: action.buttonLabel,
    onClick: action.onClick,
    timeCost: action.timeCost,
    durationHours: action.durationHours,
    durationText: action.durationText,
    moneyCost: action.moneyCost,
    repeatable: action.repeatable,
    remainingRuns: action.remainingRuns
  }));

  const baseHours = clampNumber(safeState.baseTime) + clampNumber(safeState.bonusTime) + clampNumber(safeState.dailyBonusTime);
  const hoursAvailable = Math.max(0, clampNumber(safeState.timeLeft));
  const hoursSpent = Math.max(0, baseHours - hoursAvailable);

  return {
    entries,
    emptyMessage: 'No study tracks are ready to enroll right now.',
    moneyAvailable: clampNumber(safeState.money),
    hoursAvailable,
    hoursAvailableLabel: formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: formatHours(hoursSpent)
  };
}

registerActionProvider(({ state }) => {
  const model = buildStudyEnrollmentActionModel(state);
  const entries = normalizeActionEntries(
    (Array.isArray(model?.entries) ? model.entries : []).map((entry, index) => ({
      ...entry,
      meta: [entry?.subtitle, entry?.meta].filter(Boolean).join(' • ') || entry?.meta || '',
      focusCategory: entry?.focusCategory || 'study',
      orderIndex: Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index
    }))
  );

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
});

