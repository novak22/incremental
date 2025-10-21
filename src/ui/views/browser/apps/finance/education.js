import { createBankSection } from './ledger.js';
import { formatCurrency } from '../../utils/financeFormatting.js';

function describeStudyMessage(entries = []) {
  const activeCount = entries.length;
  if (!activeCount) {
    return {
      summary: 'Study commitments: 0 active · $0 due. You have unused study capacity today.',
      detail: null
    };
  }

  const totalDue = entries.reduce((sum, entry) => sum + (Number(entry.tuition) || 0), 0);
  const pending = entries.filter(entry => !entry.studiedToday).length;
  const soonest = entries.reduce((lowest, entry) => {
    const remaining = Number(entry.remainingDays);
    if (!Number.isFinite(remaining)) return lowest;
    if (lowest == null) return remaining;
    return Math.min(lowest, remaining);
  }, null);

  const summary = `Study commitments: ${activeCount} active · ${formatCurrency(totalDue)} due.`;
  let detail = '';
  if (pending === 0) {
    detail = 'All study sessions logged today.';
  } else {
    detail = pending === activeCount
      ? 'You still have study time open today.'
      : `${pending} course${pending === 1 ? '' : 's'} still need study time.`;
  }
  if (Number.isFinite(soonest) && soonest >= 0) {
    const timeline = soonest === 0
      ? 'One course wraps today.'
      : `Soonest completion in ${soonest} day${soonest === 1 ? '' : 's'}.`;
    detail = `${detail} ${timeline}`.trim();
  }

  return { summary, detail: detail.trim() || null };
}

export default function renderFinanceEducation(entries = []) {
  const { section, body } = createBankSection(
    'Education Investments',
    'Keep tuition on radar while tracking study momentum.'
  );
  const list = Array.isArray(entries) ? entries : [];

  const card = document.createElement('article');
  card.className = 'bankapp-education__summary';

  const { summary, detail } = describeStudyMessage(list);
  const summaryLine = document.createElement('p');
  summaryLine.className = 'bankapp-education__primary';
  summaryLine.textContent = summary;
  card.appendChild(summaryLine);

  if (detail) {
    const detailLine = document.createElement('p');
    detailLine.className = 'bankapp-education__detail';
    detailLine.textContent = detail;
    card.appendChild(detailLine);
  }

  body.appendChild(card);
  return section;
}
