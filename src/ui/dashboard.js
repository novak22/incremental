import elements from './elements.js';
import { formatHours, formatMoney } from '../core/helpers.js';

function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

function renderBreakdown(listElement, items = []) {
  if (!listElement) return;
  listElement.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No details to show yet.';
    listElement.appendChild(empty);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    if (item.value) {
      const label = document.createElement('span');
      label.textContent = item.label;
      const value = document.createElement('span');
      value.textContent = item.value;
      li.append(label, value);
    } else {
      li.textContent = item.label;
    }
    listElement.appendChild(li);
  }
}

export function renderSummary(summary) {
  if (!elements.summaryPanel) return;

  const {
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
  } = summary;

  const totalReserved = setupHours + maintenanceHours;
  const setupLabel = setupCount === 1 ? 'build' : 'builds';
  const upkeepLabel = activeCount === 1 ? 'asset' : 'assets';

  setText(elements.summaryTime, `${formatHours(totalReserved)} reserved`);
  setText(
    elements.summaryTimeCaption,
    `${setupCount} ${setupLabel} in prep (${formatHours(setupHours)}) • ${activeCount} active ${upkeepLabel} (${formatHours(maintenanceHours)})`
  );
  renderBreakdown(elements.summaryTimeBreakdown, timeBreakdown);

  const minMoney = formatMoney(incomeMin);
  const maxMoney = formatMoney(incomeMax);
  const incomeLabel = incomeMin === incomeMax
    ? `$${minMoney} / day`
    : `$${minMoney} – $${maxMoney} / day`;
  setText(elements.summaryIncome, incomeLabel);
  setText(
    elements.summaryIncomeCaption,
    activeCount ? `Projected from ${activeCount} active ${upkeepLabel}` : 'No passive payouts yet'
  );
  renderBreakdown(elements.summaryIncomeBreakdown, payoutBreakdown);

  setText(elements.summaryCost, `$${formatMoney(maintenanceCost)} / day`);
  setText(
    elements.summaryCostCaption,
    maintenanceCost
      ? 'Maintenance and staffing costs to keep everything humming'
      : 'No upkeep or payroll costs today'
  );
  renderBreakdown(elements.summaryCostBreakdown, costBreakdown);

  const studyLabel = knowledgeInProgress === 1 ? 'track' : 'tracks';
  setText(elements.summaryStudy, `${knowledgeInProgress} ${studyLabel}`);
  setText(
    elements.summaryStudyCaption,
    knowledgePendingToday
      ? `${knowledgePendingToday} waiting for study time today`
      : 'All study goals are on track'
  );
  renderBreakdown(elements.summaryStudyBreakdown, studyBreakdown);
}
