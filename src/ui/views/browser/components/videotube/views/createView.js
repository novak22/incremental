export function createCreateView(options = {}) {
  const { formatCurrency, formatHours, onVideoCreated } = options;

  return function renderCreateView({ model = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--create';

    const card = document.createElement('article');
    card.className = 'videotube-create';

    const title = document.createElement('h2');
    title.textContent = 'Spin up a new video';
    card.appendChild(title);

    const launch = model.launch || {};
    const setup = launch.setup || {};
    const maintenance = launch.maintenance || {};

    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${setup.days || 0} day launch • ${formatHours(setup.hoursPerDay || 0)} each day • ${formatCurrency(setup.cost || 0)} upfront.`;
    card.appendChild(summary);

    const upkeep = document.createElement('p');
    upkeep.className = 'videotube-panel__note';
    const upkeepSummary = maintenance.hasUpkeep ? maintenance.text : 'No upkeep required';
    upkeep.textContent = `Upkeep: ${upkeepSummary}`;
    card.appendChild(upkeep);

    const form = document.createElement('form');
    form.className = 'videotube-create__form';
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (typeof launch.create !== 'function') return;
      const nameInput = form.querySelector('[name="video-name"]');
      const nicheInput = form.querySelector('[name="video-niche"]');
      const newId = launch.create({
        name: nameInput.value || launch.defaultName,
        nicheId: nicheInput.value || null
      });
      if (newId && typeof onVideoCreated === 'function') {
        onVideoCreated(newId);
      }
    });

    const nameField = document.createElement('label');
    nameField.className = 'videotube-field';
    nameField.textContent = 'Video title';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'video-name';
    nameInput.maxLength = 60;
    nameInput.className = 'videotube-input';
    nameInput.value = launch.defaultName || '';
    nameField.appendChild(nameInput);
    form.appendChild(nameField);

    const nicheField = document.createElement('label');
    nicheField.className = 'videotube-field';
    nicheField.textContent = 'Pick a niche';
    const nicheSelect = document.createElement('select');
    nicheSelect.name = 'video-niche';
    nicheSelect.className = 'videotube-select';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'No niche yet';
    nicheSelect.appendChild(blank);
    (launch.nicheOptions || []).forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} • ${option.label || ''}`.trim();
      nicheSelect.appendChild(opt);
    });
    nicheField.appendChild(nicheSelect);
    form.appendChild(nicheField);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'videotube-button videotube-button--primary';
    submit.textContent = launch.label || 'Launch video';
    submit.disabled = launch.disabled || launch.availability?.disabled;
    form.appendChild(submit);

    if (launch.availability?.reasons?.length) {
      const list = document.createElement('ul');
      list.className = 'videotube-requirements';
      launch.availability.reasons.forEach(reason => {
        const item = document.createElement('li');
        item.textContent = reason;
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    card.appendChild(form);

    const hint = document.createElement('p');
    hint.className = 'videotube-panel__hint';
    hint.textContent = 'Costs pull instantly. Niche locks after launch, so preview heat before committing!';
    card.appendChild(hint);

    container.appendChild(card);
    return container;
  };
}

export default {
  createCreateView
};
