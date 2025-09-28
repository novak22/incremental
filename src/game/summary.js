import { getState, getAssetState } from '../core/state.js';
import { formatHours } from '../core/helpers.js';
import { ASSETS } from './assets/index.js';
import { getDailyIncomeRange } from './assets/helpers.js';
import { getAssistantDailyCost } from './assistant.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from './requirements.js';

export function computeDailySummary(state = getState()) {
  if (!state) {
    return {
      setupHours: 0,
      maintenanceHours: 0,
      maintenanceCost: 0,
      incomeMin: 0,
      incomeMax: 0,
      activeCount: 0,
      setupCount: 0,
      knowledgeInProgress: 0,
      knowledgePendingToday: 0
    };
  }

  let setupHours = 0;
  let maintenanceHours = 0;
  let maintenanceCost = 0;
  let incomeMin = 0;
  let incomeMax = 0;
  let activeCount = 0;
  let setupCount = 0;

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id, state);
    if (!assetState?.instances?.length) continue;

    const setupPerDay = Math.max(0, Number(definition.setup?.hoursPerDay) || 0);
    const maintenancePerDay = Math.max(0, Number(definition.maintenance?.hours) || 0);
    const maintenanceMoney = Math.max(0, Number(definition.maintenance?.cost) || 0);
    const range = getDailyIncomeRange(definition);

    for (const instance of assetState.instances) {
      if (instance.status === 'setup') {
        setupCount += 1;
        setupHours += setupPerDay;
      } else if (instance.status === 'active') {
        activeCount += 1;
        maintenanceHours += maintenancePerDay;
        maintenanceCost += maintenanceMoney;
        incomeMin += range.min;
        incomeMax += range.max;
      }
    }
  }

  let knowledgeInProgress = 0;
  let knowledgePendingToday = 0;

  for (const track of Object.values(KNOWLEDGE_TRACKS)) {
    const progress = getKnowledgeProgress(track.id, state);
    if (progress.completed) continue;
    if (progress.daysCompleted > 0 || progress.studiedToday) {
      knowledgeInProgress += 1;
    }
    if (!progress.studiedToday) {
      knowledgePendingToday += 1;
    }
  }

  maintenanceCost += getAssistantDailyCost(state);

  return {
    setupHours,
    maintenanceHours,
    maintenanceCost,
    incomeMin,
    incomeMax,
    activeCount,
    setupCount,
    knowledgeInProgress,
    knowledgePendingToday
  };
}

export function formatTimePair(hours) {
  return formatHours(Math.max(0, hours));
}
