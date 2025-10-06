import { createStat } from '../../../components/widgets.js';
import { createCard } from '../components/card.js';
import { createBreakdownList, createSummaryList } from '../components/lists.js';

function createSnapshotCard(model = {}) {
  const card = createCard({
    title: 'Today’s Snapshot',
    summary: 'Where your hustle hours landed.'
  });

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats';

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

  card.append(stats, breakdown);
  return card;
}

export function createSummaryColumn(model = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--summary';

  column.append(
    createSnapshotCard(model),
    (() => {
      const card = createCard({
        title: 'Summary Stats',
        summary: 'Totals for today’s push.'
      });
      card.appendChild(createSummaryList(Array.isArray(model.summaryEntries) ? model.summaryEntries : []));
      return card;
    })()
  );

  return column;
}
