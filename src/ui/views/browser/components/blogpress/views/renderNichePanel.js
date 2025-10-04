export default function renderNichePanel({ instance, handlers = {} }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--niche';

  const title = document.createElement('h3');
  title.textContent = 'Audience niche';
  panel.appendChild(title);

  const current = document.createElement('p');
  current.className = 'blogpress-panel__lead';
  current.textContent = instance.niche?.name || 'Unassigned — pick a specialty once and lock it in.';
  panel.appendChild(current);

  if (instance.niche?.summary) {
    const summary = document.createElement('p');
    summary.className = 'blogpress-panel__note';
    summary.textContent = instance.niche.summary;
    panel.appendChild(summary);
  }

  if (!instance.nicheLocked) {
    const field = document.createElement('label');
    field.className = 'blogpress-field';
    field.textContent = 'Choose niche';

    const select = document.createElement('select');
    select.className = 'blogpress-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a niche';
    select.appendChild(placeholder);
    instance.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.label ? `${option.name} (${option.label})` : option.name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) return;
      if (handlers.onSelectNiche) handlers.onSelectNiche(instance.id, select.value);
      if (handlers.onViewDetail) handlers.onViewDetail(instance.id);
    });
    field.appendChild(select);
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Niches lock after selection, so pick the trend that feels dreamy.';
    panel.append(field, hint);
  } else {
    const locked = document.createElement('p');
    locked.className = 'blogpress-panel__hint';
    locked.textContent = 'Niche locked — ride the trend or pair with boosts to pivot later.';
    panel.appendChild(locked);
  }

  return panel;
}
