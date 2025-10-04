import { ensureArray } from '../../../../../../../core/helpers.js';
import { formatNicheDelta } from './nicheFormatting.js';

export default function createNicheSection(instance, helpers = {}) {
  const { formatPercent = value => String(value ?? ''), onSelectNiche = () => {} } = helpers;
  const fragment = document.createDocumentFragment();
  if (instance.niche) {
    const lead = document.createElement('p');
    lead.className = 'shopily-panel__lead';
    lead.textContent = instance.niche.name;
    const vibe = document.createElement('p');
    vibe.className = 'shopily-panel__note';
    const delta = formatNicheDelta(instance.niche.delta, formatPercent);
    const boost = formatPercent(instance.niche.multiplier - 1);
    vibe.textContent = `${instance.niche.summary || 'Trend snapshot unavailable.'} ${
      delta ? `(${delta})` : boost !== '—' ? `(${boost})` : ''
    }`.trim();
    fragment.append(lead, vibe);
  } else {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No niche assigned yet. Pick a trending lane for bonus payouts.';
    fragment.appendChild(empty);
  }
  if (!instance.nicheLocked && ensureArray(instance.nicheOptions).length) {
    const field = document.createElement('label');
    field.className = 'shopily-field';
    field.textContent = 'Assign niche';
    const select = document.createElement('select');
    select.className = 'shopily-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a niche';
    select.appendChild(placeholder);
    instance.nicheOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.id;
      optionEl.textContent = `${option.name} — ${formatPercent(option.multiplier - 1)} boost`;
      select.appendChild(optionEl);
    });
    select.value = instance.niche?.id || '';
    select.addEventListener('change', event => {
      onSelectNiche(instance.id, event.target.value || null);
    });
    field.appendChild(select);
    fragment.appendChild(field);
  } else if (instance.nicheLocked && instance.niche) {
    const locked = document.createElement('p');
    locked.className = 'shopily-panel__hint';
    locked.textContent = 'Niche locked in — upgrades can refresh trend strength.';
    fragment.appendChild(locked);
  }
  return fragment;
}
