import { ensureArray } from '../../../../../../../core/helpers.js';

export function renderNicheCell(instance, { onNicheSelect }) {
  const fragment = document.createDocumentFragment();

  if (instance.niche) {
    const name = document.createElement('strong');
    name.className = 'serverhub-niche__name';
    name.textContent = instance.niche.name;

    const note = document.createElement('span');
    note.className = 'serverhub-niche__note';
    note.textContent = instance.niche.label ? `${instance.niche.label}` : 'Trend data pending';

    fragment.append(name, note);
    return fragment;
  }

  if (instance.nicheLocked) {
    const locked = document.createElement('span');
    locked.className = 'serverhub-niche__locked';
    locked.textContent = 'Locked';
    fragment.appendChild(locked);
    return fragment;
  }

  const select = document.createElement('select');
  select.className = 'serverhub-select serverhub-select--inline';
  select.ariaLabel = `Assign niche to ${instance.label}`;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Assign niche';
  select.appendChild(placeholder);

  ensureArray(instance.nicheOptions).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
    select.appendChild(opt);
  });

  select.addEventListener('click', event => event.stopPropagation());
  select.addEventListener('change', event => {
    const value = event.target.value;
    if (!value) return;
    onNicheSelect(instance.id, value);
  });

  fragment.appendChild(select);
  return fragment;
}

export function renderNichePanel(instance, helpers) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Niche targeting';
  section.appendChild(heading);

  if (instance.niche) {
    const summary = document.createElement('p');
    summary.className = 'serverhub-panel__lead';
    const label = instance.niche.label ? `${instance.niche.label} • ` : '';
    summary.textContent = `${label}${instance.niche.summary || 'Audience details updating daily.'}`;
    section.appendChild(summary);
  }

  if (instance.nicheLocked) {
    const locked = document.createElement('p');
    locked.className = 'serverhub-panel__hint';
    locked.textContent = 'Niche locked in — reroll popularity tomorrow for fresh multipliers.';
    section.appendChild(locked);
    return section;
  }

  const field = document.createElement('label');
  field.className = 'serverhub-field';
  field.textContent = 'Assign niche';

  const select = document.createElement('select');
  select.className = 'serverhub-select';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a niche';
  select.appendChild(placeholder);

  ensureArray(instance.nicheOptions).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
    select.appendChild(opt);
  });

  select.addEventListener('change', event => {
    const value = event.target.value;
    if (!value) return;
    helpers.onNicheSelect(instance.id, value);
  });

  field.appendChild(select);
  section.appendChild(field);
  return section;
}

export default {
  renderNicheCell,
  renderNichePanel
};
