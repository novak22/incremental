import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';
import { renderSummaryCards, renderSummaryFootnote } from './summaryCards.js';

export default function renderFinanceHeader(model = {}) {
  const container = document.createElement('section');
  container.className = 'bankapp__header bankapp-section bankapp-section--summary';

  const summaryStrip = renderSummaryCards(model);
  container.appendChild(summaryStrip);

  const notes = renderSummaryFootnote(model);
  if (notes) {
    container.appendChild(notes);
  }

  const secondary = document.createElement('div');
  secondary.className = 'bankapp-header__meta';

  const pulseEntries = Array.isArray(model.pulse) ? model.pulse : [];
  if (pulseEntries.length) {
    const pulse = document.createElement('div');
    pulse.className = 'bankapp-pulse bankapp-header__pulse';

    pulseEntries.forEach(entry => {
      const item = document.createElement('span');
      item.className = `bankapp-pulse__item bankapp-pulse__item--${entry.direction === 'out' ? 'out' : 'in'}`;

      const icon = document.createElement('span');
      icon.className = 'bankapp-pulse__icon';
      icon.textContent = entry.icon || (entry.direction === 'out' ? '📉' : '💵');

      const label = document.createElement('span');
      label.className = 'bankapp-pulse__label';
      const amount = entry.direction === 'out' ? -entry.amount : entry.amount;
      const amountText = formatSignedCurrency(amount);
      label.textContent = `${amountText} ${entry.label}`;

      item.append(icon, label);
      pulse.appendChild(item);
    });

    secondary.appendChild(pulse);
  }

  if (model.quickObligation) {
    const pill = document.createElement('div');
    pill.className = 'bankapp-pill bankapp-header__pill';

    const label = document.createElement('span');
    label.className = 'bankapp-pill__label';
    label.textContent = model.quickObligation.label || 'Obligation';

    const value = document.createElement('span');
    value.className = 'bankapp-pill__value';
    value.textContent = formatCurrency(model.quickObligation.amount || 0);

    const note = document.createElement('span');
    note.className = 'bankapp-pill__note';
    note.textContent = model.quickObligation.note || '';

    pill.append(label, value, note);
    secondary.appendChild(pill);
  }

  if (model.topEarner) {
    const badge = document.createElement('div');
    badge.className = 'bankapp-badge bankapp-header__badge';

    const icon = document.createElement('span');
    icon.className = 'bankapp-badge__icon';
    icon.textContent = '🏅';

    const body = document.createElement('div');
    body.className = 'bankapp-badge__body';

    const title = document.createElement('span');
    title.className = 'bankapp-badge__title';
    title.textContent = 'Top earner today';

    const value = document.createElement('span');
    value.className = 'bankapp-badge__value';
    value.textContent = `${model.topEarner.label} • ${formatCurrency(model.topEarner.amount || 0)}`;

    body.append(title, value);
    badge.append(icon, body);
    secondary.appendChild(badge);
  }

  if (secondary.childNodes.length) {
    container.appendChild(secondary);
  }

  return container;
}
