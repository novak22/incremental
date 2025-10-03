export default function renderBlueprintsView(options = {}) {
  const {
    launch = {},
    pricing = {},
    formatters = {},
    onLaunch = () => {}
  } = options;

  const formatHours = formatters.formatHours || (value => String(value ?? ''));
  const formatMoney = formatters.formatMoney || (value => String(value ?? ''));

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--blueprint';

  const card = document.createElement('article');
  card.className = 'blogpress-blueprint';
  const title = document.createElement('h2');
  title.textContent = 'Spin up a new blog';
  const summary = document.createElement('p');
  const setup = pricing.setup || {};
  summary.textContent = `${setup.days || 0} day blueprint • ${formatHours(setup.hoursPerDay || 0)} focus per day • $${formatMoney(setup.cost || 0)} upfront.`;
  card.append(title, summary);

  if (launch.availability?.reasons?.length) {
    const list = document.createElement('ul');
    list.className = 'blogpress-requirements';
    launch.availability.reasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--primary';
  button.textContent = launch.label || 'Launch blog';
  button.disabled = Boolean(launch.disabled || launch.availability?.disabled);
  button.addEventListener('click', () => {
    if (button.disabled) return;
    onLaunch(launch);
  });
  card.appendChild(button);

  const hint = document.createElement('p');
  hint.className = 'blogpress-panel__hint';
  hint.textContent = 'Reminder: niches lock after launch, so browse the heat map before committing!';
  card.appendChild(hint);

  container.appendChild(card);
  return container;
}
