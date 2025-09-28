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
    spendBreakdown,
    studyBreakdown
  } = summary;

  setText(elements.summaryTime, `${formatHours(totalTime)} invested`);
  const timeSegments = [];
  if (setupHours > 0) timeSegments.push(`Setup ${formatHours(setupHours)}`);
  if (maintenanceHours > 0) timeSegments.push(`Upkeep ${formatHours(maintenanceHours)}`);
  if (otherTimeHours > 0) timeSegments.push(`Extras ${formatHours(otherTimeHours)}`);
  setText(
    elements.summaryTimeCaption,
    timeSegments.length ? timeSegments.join(' • ') : 'No time spent yet today'
  );
  renderBreakdown(elements.summaryTimeBreakdown, timeBreakdown);

  setText(elements.summaryIncome, `$${formatMoney(totalEarnings)} today`);
  const earningsSegments = [];
  if (passiveEarnings > 0) earningsSegments.push(`Passive streams $${formatMoney(passiveEarnings)}`);
  if (activeEarnings > 0) earningsSegments.push(`Active hustles $${formatMoney(activeEarnings)}`);
  setText(
    elements.summaryIncomeCaption,
    earningsSegments.length ? earningsSegments.join(' • ') : 'No earnings logged yet today'
  );
  renderBreakdown(elements.summaryIncomeBreakdown, earningsBreakdown);

  setText(elements.summaryCost, `$${formatMoney(totalSpend)} today`);
  const spendSegments = [];
  if (upkeepSpend > 0) spendSegments.push(`Upkeep & payroll $${formatMoney(upkeepSpend)}`);
  if (investmentSpend > 0) spendSegments.push(`Investments & boosts $${formatMoney(investmentSpend)}`);
  setText(
    elements.summaryCostCaption,
    spendSegments.length ? spendSegments.join(' • ') : 'No spending logged yet today'
  );
  renderBreakdown(elements.summaryCostBreakdown, spendBreakdown);

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
