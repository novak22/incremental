import { ensureArray } from '../../../../../../core/helpers.js';

function formatIncomeRange(range = {}, formatCurrency) {
  const min = Math.max(0, Number(range.min) || 0);
  const max = Math.max(0, Number(range.max) || 0);
  if (max <= min) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function formatBlueprint(setup = {}, maintenance = {}, formatCurrency, formatHours) {
  const days = Math.max(0, Number(setup.days) || 0);
  const hoursPerDay = Math.max(0, Number(setup.hoursPerDay) || 0);
  const cost = Math.max(0, Number(setup.cost) || 0);
  const dayText = `${days} day${days === 1 ? '' : 's'}`;
  const hoursText = hoursPerDay > 0 ? formatHours(hoursPerDay) : 'Instant';
  const upkeepText = maintenance?.hasUpkeep ? maintenance.text : 'No upkeep';
  return `Launch blueprint: ${dayText} × ${hoursText}/day • ${formatCurrency(cost)} setup • Daily upkeep ${upkeepText}`;
}

function formatActionMeta(action = {}, formatCurrency, formatHours) {
  const pieces = [];
  if (Number(action.time) > 0) {
    pieces.push(formatHours(action.time));
  }
  if (Number(action.cost) > 0) {
    pieces.push(formatCurrency(action.cost));
  }
  return pieces.length ? pieces.join(' • ') : 'Instant';
}

function buildPlanCard(level, formatCurrency) {
  const card = document.createElement('article');
  card.className = 'videotube-panel videotube-plan';
  card.dataset.tier = level.level;

  const heading = document.createElement('h3');
  heading.className = 'videotube-plan__title';
  heading.textContent = `Quality ${level.level} — ${level.name}`;

  const income = document.createElement('p');
  income.className = 'videotube-plan__income';
  income.textContent = `Projected daily payout: ${formatIncomeRange(level.income, formatCurrency)}`;

  const description = document.createElement('p');
  description.className = 'videotube-plan__summary';
  description.textContent = level.description || 'Steady growth tier.';

  card.append(heading, income, description);
  return card;
}

function buildGearList(gear = [], formatCurrency) {
  if (!gear.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-pricing__empty';
    empty.textContent = 'Gear highlights unlock once you uncover more studio upgrades.';
    return empty;
  }
  const list = document.createElement('ul');
  list.className = 'videotube-list videotube-pricing__gear';
  gear.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'videotube-pricing__gear-item';
    const label = document.createElement('span');
    label.className = 'videotube-pricing__gear-label';
    label.textContent = `${entry.familyTitle || 'Gear'} — ${entry.name}`;
    const value = document.createElement('span');
    value.className = 'videotube-pricing__gear-value';
    value.textContent = formatCurrency(entry.cost || 0);
    item.append(label, value);
    list.appendChild(item);
  });
  return list;
}

export function createPricingView({ formatCurrency = value => String(value ?? ''), formatHours = value => String(value ?? '') } = {}) {
  return function renderPricingView({ model = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--pricing';

    const pricing = model.pricing;
    if (!pricing) {
      const empty = document.createElement('p');
      empty.className = 'videotube-empty';
      empty.textContent = 'Pricing intel unlocks once your first vlog goes live.';
      container.appendChild(empty);
      return container;
    }

    const intro = document.createElement('article');
    intro.className = 'videotube-panel videotube-pricing__intro';
    const title = document.createElement('h2');
    title.textContent = 'VideoTube pricing & planning map';
    const summary = document.createElement('p');
    summary.className = 'videotube-pricing__summary';
    summary.textContent = pricing.summary
      || 'Map out production tiers, action costs, and niche scouting before you hit record.';
    const blueprint = document.createElement('p');
    blueprint.className = 'videotube-pricing__meta';
    blueprint.textContent = formatBlueprint(pricing.setup, pricing.maintenance, formatCurrency, formatHours);
    intro.append(title, summary, blueprint);
    container.appendChild(intro);

    const levels = ensureArray(pricing.levels);
    const grid = document.createElement('div');
    grid.className = 'videotube-pricing__grid';
    if (!levels.length) {
      const emptyLevels = document.createElement('p');
      emptyLevels.className = 'videotube-pricing__empty';
      emptyLevels.textContent = 'Quality tiers reveal as you explore the VideoTube storyline.';
      grid.appendChild(emptyLevels);
    } else {
      levels.forEach(level => {
        grid.appendChild(buildPlanCard(level, formatCurrency));
      });
    }
    container.appendChild(grid);

    const actionsSection = document.createElement('article');
    actionsSection.className = 'videotube-panel videotube-pricing__section';
    const actionsTitle = document.createElement('h3');
    actionsTitle.textContent = 'Quality action lineup';
    const actionList = document.createElement('ul');
    actionList.className = 'videotube-list videotube-pricing__actions';
    const actions = ensureArray(pricing.actions);
    if (!actions.length) {
      const emptyAction = document.createElement('li');
      emptyAction.textContent = 'Quality actions unlock once your first vlog broadcasts.';
      actionList.appendChild(emptyAction);
    } else {
      actions.forEach(action => {
        const item = document.createElement('li');
        item.className = 'videotube-pricing__action';
        const label = document.createElement('span');
        label.className = 'videotube-pricing__action-label';
        label.textContent = action.label;
        const value = document.createElement('span');
        value.className = 'videotube-pricing__action-value';
        value.textContent = formatActionMeta(action, formatCurrency, formatHours);
        item.append(label, value);
        actionList.appendChild(item);
      });
    }
    actionsSection.append(actionsTitle, actionList);
    container.appendChild(actionsSection);

    const gearSection = document.createElement('article');
    gearSection.className = 'videotube-panel videotube-pricing__section';
    const gearTitle = document.createElement('h3');
    gearTitle.textContent = 'Gear highlights';
    gearSection.appendChild(gearTitle);
    gearSection.appendChild(buildGearList(ensureArray(pricing.gearHighlights), formatCurrency));
    container.appendChild(gearSection);

    const nicheSection = document.createElement('article');
    nicheSection.className = 'videotube-panel videotube-pricing__section';
    const nicheTitle = document.createElement('h3');
    nicheTitle.textContent = 'Niche scouting';
    const nicheNote = document.createElement('p');
    const niches = ensureArray(pricing.topNiches);
    if (!niches.length) {
      nicheNote.textContent = 'Niche intel unlocks once you launch your first VideoTube channel.';
      nicheSection.appendChild(nicheTitle);
      nicheSection.appendChild(nicheNote);
    } else {
      const nicheSummary = niches.map(entry => `${entry.name} (${entry.label || 'steady'})`).join(', ');
      if (pricing.nicheCount > niches.length) {
        nicheNote.textContent = `Top picks today: ${nicheSummary} • ${pricing.nicheCount} niches tracked.`;
      } else {
        nicheNote.textContent = `Top picks today: ${nicheSummary}`;
      }
      const badgeRow = document.createElement('div');
      badgeRow.className = 'videotube-pricing__niches';
      niches.forEach(niche => {
        const badge = document.createElement('span');
        badge.className = 'videotube-niche';
        if (niche.label) {
          badge.dataset.tone = niche.label.toLowerCase();
        }
        badge.textContent = `${niche.name} (${niche.label || 'steady'})`;
        badge.title = niche.summary || '';
        badgeRow.appendChild(badge);
      });
      nicheSection.append(nicheTitle, nicheNote, badgeRow);
    }
    container.appendChild(nicheSection);

    return container;
  };
}

export default {
  createPricingView
};
