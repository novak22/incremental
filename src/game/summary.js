import { getState, getAssetState } from '../core/state.js';
import { formatHours, formatMoney } from '../core/helpers.js';
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
      knowledgePendingToday: 0,
      timeBreakdown: [],
      payoutBreakdown: [],
      costBreakdown: [],
      studyBreakdown: []
    };
  }

  let setupHours = 0;
  let maintenanceHours = 0;
  let maintenanceCost = 0;
  let incomeMin = 0;
  let incomeMax = 0;
  let activeCount = 0;
  let setupCount = 0;

  const setupMap = new Map();
  const upkeepMap = new Map();
  const incomeMap = new Map();
  const costMap = new Map();

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id, state);
    if (!assetState?.instances?.length) continue;

    const setupPerDay = Math.max(0, Number(definition.setup?.hoursPerDay) || 0);
    const maintenancePerDay = Math.max(0, Number(definition.maintenance?.hours) || 0);
    const maintenanceMoney = Math.max(0, Number(definition.maintenance?.cost) || 0);
    const range = getDailyIncomeRange(definition);
    const label = definition.singular || definition.name;

    for (const instance of assetState.instances) {
      if (instance.status === 'setup') {
        setupCount += 1;
        setupHours += setupPerDay;
        if (setupPerDay > 0) {
          setupMap.set(label, (setupMap.get(label) || 0) + setupPerDay);
        }
      } else if (instance.status === 'active') {
        activeCount += 1;
        maintenanceHours += maintenancePerDay;
        maintenanceCost += maintenanceMoney;
        incomeMin += range.min;
        incomeMax += range.max;

        if (maintenancePerDay > 0) {
          upkeepMap.set(label, (upkeepMap.get(label) || 0) + maintenancePerDay);
        }

        const incomeEntry = incomeMap.get(label) || { min: 0, max: 0, count: 0 };
        incomeEntry.min += range.min;
        incomeEntry.max += range.max;
        incomeEntry.count += 1;
        incomeMap.set(label, incomeEntry);

        if (maintenanceMoney > 0) {
          costMap.set(label, (costMap.get(label) || 0) + maintenanceMoney);
        }
      }
    }
  }

  const assistantCost = getAssistantDailyCost(state);
  maintenanceCost += assistantCost;

  const timeBreakdown = [];
  for (const [label, hours] of setupMap.entries()) {
    timeBreakdown.push({ label: `🚀 ${label} prep`, value: `${formatHours(hours)} / day` });
  }
  for (const [label, hours] of upkeepMap.entries()) {
    timeBreakdown.push({ label: `🛠️ ${label} upkeep`, value: `${formatHours(hours)} / day` });
  }

  const payoutBreakdown = Array.from(incomeMap.entries()).map(([label, values]) => {
    const min = formatMoney(values.min);
    const max = formatMoney(values.max);
    const suffix = values.min === values.max ? `/day` : `/day range`;
    const amount = values.min === values.max ? `$${min}` : `$${min} – $${max}`;
    return { label: `💰 ${label}`, value: `${amount} ${suffix}` };
  });

  const costBreakdown = Array.from(costMap.entries()).map(([label, value]) => ({
    label: `🔧 ${label} upkeep`,
    value: `$${formatMoney(value)} / day`
  }));
  if (assistantCost > 0) {
    costBreakdown.push({ label: '🤖 Assistant squad', value: `$${formatMoney(assistantCost)} / day` });
  }

  let knowledgeInProgress = 0;
  let knowledgePendingToday = 0;
  const studyBreakdown = [];

  for (const track of Object.values(KNOWLEDGE_TRACKS)) {
    const progress = getKnowledgeProgress(track.id, state);
    if (progress.completed) continue;
    const inProgress = progress.daysCompleted > 0 || progress.studiedToday;
    if (inProgress) {
      knowledgeInProgress += 1;
    }
    if (!progress.studiedToday) {
      knowledgePendingToday += 1;
    }

    if (inProgress) {
      const remainingDays = Math.max(0, track.days - progress.daysCompleted);
      const status = progress.studiedToday ? 'studied' : 'waiting';
      studyBreakdown.push({
        label: `📘 ${track.name}`,
        value: `${formatHours(track.hoursPerDay)} / day • ${remainingDays} day${remainingDays === 1 ? '' : 's'} left (${status})`
      });
    }
  }

  return {
    setupHours,
    maintenanceHours,
    maintenanceCost,
    incomeMin,
    incomeMax,
    activeCount,
    setupCount,
    knowledgeInProgress,
    knowledgePendingToday,
    timeBreakdown,
    payoutBreakdown,
    costBreakdown,
    studyBreakdown
  };
}

export function formatTimePair(hours) {
  return formatHours(Math.max(0, hours));
}
