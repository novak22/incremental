import { createStat } from '../../../components/widgets.js';
import { createCard } from '../components/card.js';
import { createBreakdownList, createSummaryList } from '../components/lists.js';

function createSnapshotCard(model = {}) {
  const card = createCard({
    title: 'Daily operating picture',
    summary: 'Real-time signal on capacity, throughput, and remaining fuel.'
  });

  const layout = document.createElement('div');
  layout.className = 'timodoro-snapshot';

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats timodoro-snapshot__stats';

  const availableLabel = model.hoursAvailableLabel || '0h';
  const spentLabel = model.hoursSpentLabel || '0h';

  const availableStat = createStat('Hours available', availableLabel);
  const availableValue = availableStat.querySelector('.browser-card__stat-value');
  if (availableValue) {
    availableValue.dataset.role = 'timodoro-hours-available';
  }

  const spentStat = createStat('Hours spent', spentLabel);
  const spentValue = spentStat.querySelector('.browser-card__stat-value');
  if (spentValue) {
    spentValue.dataset.role = 'timodoro-hours-spent';
  }

  stats.append(availableStat, spentStat);

  const breakdown = createBreakdownList(Array.isArray(model.breakdownEntries) ? model.breakdownEntries : []);
  breakdown.classList.add('timodoro-snapshot__breakdown');

  layout.append(stats, breakdown);
  card.appendChild(layout);
  return card;
}

export function createSummaryColumn(model = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--summary';

  column.append(
    createSnapshotCard(model),
    (() => {
      const card = createCard({
        title: 'Board insights',
        summary: 'Context for your next standup update.'
      });
      card.appendChild(createSummaryList(Array.isArray(model.summaryEntries) ? model.summaryEntries : []));
      return card;
    })()
  );

  return column;
}
