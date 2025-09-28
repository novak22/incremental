import elements from './elements.js';
import { formatHours, formatMoney } from '../core/helpers.js';

function safeText(element, text) {
  if (!element) return;
  element.textContent = text;
}

export function renderSummary(summary) {
  if (!elements.summaryBar) return;
  const {
    setupHours,
    maintenanceHours,
    maintenanceCost,
    incomeMin,
    incomeMax,
    activeCount,
    setupCount,
    knowledgeInProgress,
    knowledgePendingToday
  } = summary;

  const totalReserved = setupHours + maintenanceHours;
  const setupLabel = setupCount === 1 ? 'build' : 'builds';
  const upkeepLabel = activeCount === 1 ? 'asset' : 'assets';

  safeText(elements.summaryTime, `${formatHours(totalReserved)} reserved`);
  safeText(
    elements.summaryTimeDetail,
    `${setupCount} ${setupLabel} in prep (${formatHours(setupHours)}) • ${activeCount} active ${upkeepLabel} (${formatHours(maintenanceHours)})`
  );

  const minMoney = formatMoney(incomeMin);
  const maxMoney = formatMoney(incomeMax);
  const incomeLabel = incomeMin === incomeMax
    ? `$${minMoney} / day`
    : `$${minMoney} – $${maxMoney} / day`;
  safeText(elements.summaryIncome, incomeLabel);
  safeText(
    elements.summaryIncomeDetail,
    activeCount ? `Projected from ${activeCount} active ${upkeepLabel}` : 'No passive payouts yet'
  );

  safeText(elements.summaryCost, `$${formatMoney(maintenanceCost)} / day`);
  safeText(
    elements.summaryCostDetail,
    maintenanceCost ? 'Maintenance costs to keep everything humming' : 'No upkeep costs today'
  );

  const studyLabel = knowledgeInProgress === 1 ? 'track' : 'tracks';
  safeText(elements.summaryStudy, `${knowledgeInProgress} ${studyLabel}`);
  safeText(
    elements.summaryStudyDetail,
    knowledgePendingToday
      ? `${knowledgePendingToday} waiting for study time today`
      : 'All study goals are on track'
  );
}
