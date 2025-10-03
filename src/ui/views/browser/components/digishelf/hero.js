function createHeroStat(label, value, tone = 'default') {
  const stat = document.createElement('div');
  stat.className = `digishelf-hero__stat digishelf-hero__stat--${tone}`;

  const statValue = document.createElement('span');
  statValue.className = 'digishelf-hero__value';
  statValue.textContent = value;
  const statLabel = document.createElement('span');
  statLabel.className = 'digishelf-hero__label';
  statLabel.textContent = label;

  stat.append(statValue, statLabel);
  return stat;
}

function renderLaunchCard(assetId, model, dependencies = {}) {
  const {
    formatHours = value => String(value ?? ''),
    formatMoney = value => String(value ?? ''),
    onConfirmLaunch = async () => true
  } = dependencies;

  if (!model?.definition || !model.launch) {
    const locked = document.createElement('article');
    locked.className = 'digishelf-launch digishelf-launch--locked';
    const heading = document.createElement('h3');
    heading.textContent = 'Locked';
    const note = document.createElement('p');
    note.textContent = 'Complete requirements in the classic dashboard to unlock this resource.';
    locked.append(heading, note);
    return locked;
  }

  const card = document.createElement('article');
  card.className = 'digishelf-launch';

  const title = document.createElement('h3');
  title.textContent = model.definition.name;

  const summary = document.createElement('p');
  summary.textContent = model.definition.description || 'Launch a fresh income stream in minutes.';

  const meta = document.createElement('p');
  meta.className = 'digishelf-launch__meta';
  const setup = model.definition.setup || {};
  const upkeep = model.definition.maintenance || {};
  const setupParts = [];
  if (setup.days > 0) {
    setupParts.push(`${setup.days} day${setup.days === 1 ? '' : 's'}`);
  }
  if (setup.hoursPerDay > 0) {
    setupParts.push(`${formatHours(setup.hoursPerDay)}/day`);
  }
  if (setup.cost > 0) {
    setupParts.push(`$${formatMoney(setup.cost)} upfront`);
  }
  const upkeepParts = [];
  if (upkeep.hours > 0) {
    upkeepParts.push(`${formatHours(upkeep.hours)}/day`);
  }
  if (upkeep.cost > 0) {
    upkeepParts.push(`$${formatMoney(upkeep.cost)}/day`);
  }
  meta.textContent = `${setupParts.join(' • ') || 'Instant launch'} • ${upkeepParts.join(' + ') || 'No upkeep'}`;

  const actions = document.createElement('div');
  actions.className = 'digishelf-launch__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--primary';
  button.textContent = model.launch.label || 'Launch';
  button.disabled = Boolean(model.launch.disabled || model.launch.availability?.disabled);
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    const confirmed = await onConfirmLaunch(model.definition);
    if (!confirmed) {
      return;
    }
    model.launch.onClick?.();
  });

  actions.appendChild(button);

  if (Array.isArray(model.launch.availability?.reasons) && model.launch.availability.reasons.length) {
    const reasons = document.createElement('ul');
    reasons.className = 'digishelf-launch__reasons';
    model.launch.availability.reasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      reasons.appendChild(item);
    });
    card.append(title, summary, meta, actions, reasons);
  } else {
    card.append(title, summary, meta, actions);
  }

  card.dataset.assetId = assetId;
  return card;
}

export default function renderHero(options = {}) {
  const {
    model = {},
    state = {},
    formatCurrency = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    formatMoney = value => String(value ?? ''),
    onToggleLaunch = () => {},
    onConfirmLaunch = async () => true
  } = options;

  const hero = document.createElement('section');
  hero.className = 'digishelf-hero';

  const copy = document.createElement('div');
  copy.className = 'digishelf-hero__copy';

  const heading = document.createElement('h1');
  heading.textContent = 'DigiShelf';

  const subheading = document.createElement('p');
  subheading.textContent = 'Your digital creations, one shelf away from the world.';

  copy.append(heading, subheading);

  const stats = document.createElement('div');
  stats.className = 'digishelf-hero__stats';
  stats.append(
    createHeroStat('Active E-Book Series', `${model.overview?.ebooksActive ?? 0}`),
    createHeroStat('Active Photo Galleries', `${model.overview?.stockActive ?? 0}`),
    createHeroStat('Daily Royalties', formatCurrency(model.overview?.totalDaily ?? 0), 'accent')
  );

  const actions = document.createElement('div');
  actions.className = 'digishelf-hero__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--primary';
  button.textContent = 'Publish a new resource';
  button.addEventListener('click', onToggleLaunch);

  actions.appendChild(button);

  hero.append(copy, stats, actions);

  if (state.launchOpen) {
    const launchPanel = document.createElement('div');
    launchPanel.className = 'digishelf-launcher';
    launchPanel.append(
      renderLaunchCard('ebook', model.ebook, { formatHours, formatMoney, onConfirmLaunch }),
      renderLaunchCard('stockPhotos', model.stock, { formatHours, formatMoney, onConfirmLaunch })
    );
    hero.appendChild(launchPanel);
  }

  return hero;
}
