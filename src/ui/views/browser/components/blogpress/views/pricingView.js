import { ensureArray } from '../../../../../../core/helpers.js';

export default function renderPricingView(options = {}) {
  const {
    pricing = {},
    formatters = {},
    formatRange = () => 'No payout yet'
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatHours = formatters.formatHours || (value => String(value ?? ''));
  const formatMoney = formatters.formatMoney || (value => String(value ?? ''));

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--pricing';

  const intro = document.createElement('div');
  intro.className = 'blogpress-pricing__intro';
  const title = document.createElement('h2');
  title.textContent = 'BlogPress pricing & growth map';
  const lead = document.createElement('p');
  const setup = pricing.setup || {};
  const maintenance = pricing.maintenance || {};
  const upkeepText = maintenance.hasUpkeep ? maintenance.text : 'No upkeep';
  lead.textContent = `Blueprint: ${setup.days || 0} day${setup.days === 1 ? '' : 's'} × ${formatHours(setup.hoursPerDay || 0)} ($${formatMoney(setup.cost || 0)}) • Daily upkeep ${upkeepText}`;
  intro.append(title, lead);
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'blogpress-pricing__grid';
  ensureArray(pricing.levels).forEach(level => {
    const card = document.createElement('article');
    card.className = 'blogpress-plan';
    const heading = document.createElement('h3');
    heading.textContent = `Quality ${level.level} — ${level.name}`;
    const range = document.createElement('p');
    range.className = 'blogpress-plan__range';
    range.textContent = `Income: ${formatRange(level.income)}`;
    const description = document.createElement('p');
    description.textContent = level.description || '';
    card.append(heading, range, description);
    grid.appendChild(card);
  });
  container.appendChild(grid);

  const nicheBlock = document.createElement('section');
  nicheBlock.className = 'blogpress-pricing__section';
  const nicheTitle = document.createElement('h3');
  nicheTitle.textContent = 'Niche heat map';
  const nicheNote = document.createElement('p');
  const topNiches = ensureArray(pricing.topNiches);
  nicheNote.textContent = topNiches.length
    ? `Top picks today: ${topNiches.map(entry => `${entry.name} (${entry.label || 'steady'})`).join(', ')}.`
    : 'Niche intel unlocks once blueprints are live.';
  nicheBlock.append(nicheTitle, nicheNote);
  const nicheHint = document.createElement('p');
  nicheHint.className = 'blogpress-panel__hint';
  nicheHint.textContent = 'Pick once per blog — a locked niche hugs its trend multiplier for life.';
  nicheBlock.appendChild(nicheHint);
  container.appendChild(nicheBlock);

  const actionBlock = document.createElement('section');
  actionBlock.className = 'blogpress-pricing__section';
  const actionTitle = document.createElement('h3');
  actionTitle.textContent = 'Quality action lineup';
  actionBlock.appendChild(actionTitle);
  const actionList = document.createElement('ul');
  actionList.className = 'blogpress-list';
  ensureArray(pricing.actions).forEach(action => {
    const item = document.createElement('li');
    item.className = 'blogpress-list__item';
    const label = document.createElement('span');
    label.className = 'blogpress-list__label';
    label.textContent = action.label;
    const value = document.createElement('span');
    value.className = 'blogpress-list__value';
    const parts = [];
    if (action.time > 0) parts.push(formatHours(action.time));
    if (action.cost > 0) parts.push(formatCurrency(action.cost));
    value.textContent = parts.length ? parts.join(' • ') : 'Instant';
    item.append(label, value);
    actionList.appendChild(item);
  });
  actionBlock.appendChild(actionList);
  container.appendChild(actionBlock);

  const upgradeBlock = document.createElement('section');
  upgradeBlock.className = 'blogpress-pricing__section';
  const upgradeTitle = document.createElement('h3');
  upgradeTitle.textContent = 'Upgrade boosts';
  upgradeBlock.appendChild(upgradeTitle);
  const upgradeList = document.createElement('ul');
  upgradeList.className = 'blogpress-list';
  const upgrades = ensureArray(pricing.upgrades);
  if (upgrades.length) {
    upgrades.forEach(upgrade => {
      const item = document.createElement('li');
      item.className = 'blogpress-list__item';
      const label = document.createElement('span');
      label.className = 'blogpress-list__label';
      label.textContent = upgrade.name;
      const value = document.createElement('span');
      value.className = 'blogpress-list__value';
      value.textContent = `${formatCurrency(upgrade.cost)} • ${upgrade.description}`;
      item.append(label, value);
      upgradeList.appendChild(item);
    });
  } else {
    const item = document.createElement('li');
    item.className = 'blogpress-list__item';
    item.textContent = 'Upgrades unlock once your first blog goes live.';
    upgradeList.appendChild(item);
  }
  upgradeBlock.appendChild(upgradeList);
  container.appendChild(upgradeBlock);

  return container;
}
