import { createCard } from '../components/card.js';
import { createBreakdownList, createSummaryList } from '../components/lists.js';

function createHoursStat({ label, value, datasetRole }) {
  const stat = document.createElement('div');
  stat.className = 'timodoro-pulse__stat';

  const statLabel = document.createElement('span');
  statLabel.className = 'timodoro-pulse__stat-label';
  statLabel.textContent = label;

  const statValue = document.createElement('span');
  statValue.className = 'timodoro-pulse__stat-value';
  statValue.textContent = value;
  if (datasetRole) {
    statValue.dataset.role = datasetRole;
  }

  stat.append(statLabel, statValue);
  return stat;
}

function createPulseCard(model = {}) {
  const card = createCard({
    title: 'Daily pulse',
    summary: 'Flow check, streaks, and grind stats in one glance.'
  });

  const pulse = document.createElement('section');
  pulse.className = 'timodoro-pulse';

  const streak = document.createElement('div');
  streak.className = 'timodoro-pulse__streak';
  streak.textContent = model.focusStreakLabel || 'No streak yet — today is a fresh start.';

  const hours = document.createElement('div');
  hours.className = 'timodoro-pulse__hours';
  hours.append(
    createHoursStat({
      label: 'Hours grinding',
      value: model.hoursSpentLabel || '0h',
      datasetRole: 'timodoro-hours-spent'
    }),
    createHoursStat({
      label: 'Fuel left',
      value: model.hoursAvailableLabel || '0h',
      datasetRole: 'timodoro-hours-available'
    })
  );

  const insights = document.createElement('section');
  insights.className = 'timodoro-insights';

  const insightsTitle = document.createElement('h3');
  insightsTitle.className = 'timodoro-insights__title';
  insightsTitle.textContent = 'Flow check';

  const summaryList = createSummaryList(Array.isArray(model.summaryEntries) ? model.summaryEntries : []);

  const breakdownSection = document.createElement('section');
  breakdownSection.className = 'timodoro-breakdown';

  const breakdownTitle = document.createElement('h3');
  breakdownTitle.className = 'timodoro-breakdown__title';
  breakdownTitle.textContent = 'Where time landed';

  const breakdownList = createBreakdownList(Array.isArray(model.breakdownEntries) ? model.breakdownEntries : []);

  insights.append(insightsTitle, summaryList);
  breakdownSection.append(breakdownTitle, breakdownList);

  pulse.append(streak, hours, insights, breakdownSection);
  card.appendChild(pulse);

  return card;
}

export function createSummaryColumn(model = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--summary';

  column.append(createPulseCard(model));

  return column;
}
