function renderNicheBadge(video) {
  const badge = document.createElement('span');
  badge.className = 'videotube-niche';

  if (video.niche) {
    badge.textContent = video.niche.name;
    badge.dataset.tone = video.niche.label?.toLowerCase() || 'steady';
    if (video.niche.label) {
      badge.title = `${video.niche.label} • ${video.niche.summary}`;
    }
  } else {
    badge.textContent = 'No niche yet';
    badge.dataset.tone = 'idle';
  }

  return badge;
}

export default function renderNichePanel(video, { onNicheSelect } = {}) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';

  const title = document.createElement('h3');
  title.textContent = 'Niche focus';
  panel.appendChild(title);

  if (video.nicheLocked && video.niche) {
    const badge = renderNicheBadge(video);
    badge.classList.add('videotube-niche--large');
    panel.appendChild(badge);

    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.niche.label || 'Steady'} demand • ${video.niche.summary}`;
    panel.appendChild(summary);
    return panel;
  }

  const description = document.createElement('p');
  description.className = 'videotube-panel__note';
  description.textContent = 'Lock a niche once to boost payouts. Choose wisely — it sticks after launch!';
  panel.appendChild(description);

  const field = document.createElement('label');
  field.className = 'videotube-field';
  field.textContent = 'Select niche';

  const select = document.createElement('select');
  select.className = 'videotube-select';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Pick a niche';
  select.appendChild(emptyOption);

  (video.nicheOptions || []).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} • ${option.label || ''}`.trim();
    opt.title = option.summary || '';
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    if (!select.value) return;
    onNicheSelect?.(video.id, select.value);
  });

  field.appendChild(select);
  panel.appendChild(field);

  return panel;
}
