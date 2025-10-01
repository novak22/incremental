import { getState } from '../core/state.js';
import {
  selectDailyCostEntries,
  selectDailyPayoutEntries,
  selectDailyTimeEntries,
  selectStudyProgressEntries
} from './summary/selectors.js';

function sumEntries(entries, field, predicate = () => true) {
  return entries.reduce((total, entry) => {
    if (!predicate(entry)) return total;
    const value = Number(entry?.[field]);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

export function computeDailySummary(state = getState()) {
  if (!state) {
    return {
      totalTime: 0,
      setupHours: 0,
      maintenanceHours: 0,
      otherTimeHours: 0,
      totalEarnings: 0,
      passiveEarnings: 0,
      activeEarnings: 0,
      totalSpend: 0,
      upkeepSpend: 0,
      investmentSpend: 0,
      knowledgeInProgress: 0,
      knowledgePendingToday: 0,
      timeBreakdown: [],
      earningsBreakdown: [],
      passiveBreakdown: [],
      spendBreakdown: [],
      studyBreakdown: []
    };
  }

  const timeBreakdown = selectDailyTimeEntries(state);
  const payoutEntries = selectDailyPayoutEntries(state);
  const passiveBreakdown = payoutEntries.filter(entry => entry.stream !== 'active');
  const earningsBreakdown = payoutEntries.filter(entry => entry.stream === 'active');
  const spendBreakdown = selectDailyCostEntries(state);
  const studyBreakdown = selectStudyProgressEntries(state);

  const totalTime = sumEntries(timeBreakdown, 'hours');
  const setupHours = sumEntries(timeBreakdown, 'hours', entry => entry.category === 'setup');
  const maintenanceHours = sumEntries(timeBreakdown, 'hours', entry => entry.category === 'maintenance');
  const otherTimeHours = Math.max(0, totalTime - setupHours - maintenanceHours);

  const totalEarnings = sumEntries(payoutEntries, 'amount');
  const passiveEarnings = sumEntries(passiveBreakdown, 'amount');
  const activeEarnings = sumEntries(earningsBreakdown, 'amount');

  const totalSpend = sumEntries(spendBreakdown, 'amount');
  const upkeepSpend = sumEntries(
    spendBreakdown,
    'amount',
    entry => ['maintenance', 'payroll'].includes(entry.category)
  );
  const investmentSpend = sumEntries(
    spendBreakdown,
    'amount',
    entry => ['setup', 'investment', 'upgrade', 'consumable'].includes(entry.category)
  );

  const knowledgeInProgress = studyBreakdown.length;
  const knowledgePendingToday = studyBreakdown.filter(entry => !entry.studiedToday).length;

  return {
    totalTime,
    setupHours,
    maintenanceHours,
    otherTimeHours,
    totalEarnings,
    passiveEarnings,
    activeEarnings,
    totalSpend,
    upkeepSpend,
    investmentSpend,
    knowledgeInProgress,
    knowledgePendingToday,
    timeBreakdown,
    earningsBreakdown,
    passiveBreakdown,
    spendBreakdown,
    studyBreakdown
  };
}
