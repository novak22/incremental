import { ensureArray } from '../../../../../core/helpers.js';

export default function renderPricingCards(options = {}) {
  const {
    pricing = [],
    formatters = {},
    onSelectPlan = () => {},
    emptyMessage = 'Plans unlock once you launch your first digital asset.'
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatHours = formatters.formatHours || (value => String(value ?? ''));
  const formatMoney = formatters.formatMoney || (value => String(value ?? ''));

  const section = document.createElement('section');
  section.className = 'digishelf-pricing';

  const intro = document.createElement('div');
  intro.className = 'digishelf-pricing__intro';
  const heading = document.createElement('h2');
  heading.textContent = 'Pricing & Scaling Plans';
  const note = document.createElement('p');
  note.textContent = 'Compare launch effort, upkeep, and daily earning potential for each digital asset lane.';
  intro.append(heading, note);

  const grid = document.createElement('div');
  grid.className = 'digishelf-pricing__grid';

  const plans = ensureArray(pricing);
  if (!plans.length) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-empty';
    empty.textContent = emptyMessage;
    section.append(intro, empty);
    return section;
  }

  plans.forEach(plan => {
    const card = document.createElement('article');
    card.className = 'digishelf-plan';
    const title = document.createElement('h3');
    title.textContent = plan.title;
    const subtitle = document.createElement('p');
    subtitle.className = 'digishelf-plan__subtitle';
    subtitle.textContent = plan.subtitle;
    const summary = document.createElement('p');
    summary.textContent = plan.summary;

    const stats = document.createElement('ul');
    stats.className = 'digishelf-plan__stats';

    const setupItem = document.createElement('li');
    const setupHours = plan.setup.hoursPerDay ? `${formatHours(plan.setup.hoursPerDay)}` : 'Instant';
    const setupDays = plan.setup.days ? `${plan.setup.days}d` : '';
    const setupLabel = [setupDays, setupHours].filter(Boolean).join(' • ') || 'Instant';
    setupItem.innerHTML = `<span>Setup</span><strong>${setupLabel} • $${formatMoney(plan.setup.cost)}</strong>`;

    const upkeepItem = document.createElement('li');
    const upkeepHours = plan.upkeep.hours ? `${formatHours(plan.upkeep.hours)}/day` : 'No hours';
    upkeepItem.innerHTML = `<span>Upkeep</span><strong>${upkeepHours} • $${formatMoney(plan.upkeep.cost)}/day</strong>`;

    const payoutItem = document.createElement('li');
    payoutItem.innerHTML = `<span>Avg Daily Payout</span><strong>${formatCurrency(plan.averageDaily)}</strong>`;

    stats.append(setupItem, upkeepItem, payoutItem);

    const requirements = document.createElement('p');
    requirements.className = 'digishelf-plan__requirements';
    const education = ensureArray(plan.education).length
      ? `Requires courses: ${plan.education.join(', ')}`
      : 'No courses required';
    const toolkit = ensureArray(plan.equipment).length
      ? `Toolkit: ${plan.equipment.join(', ')}`
      : 'No extra tools required';
    requirements.textContent = `${education} • ${toolkit}`;

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'digishelf-button digishelf-button--primary';
    cta.textContent = plan.cta || 'Launch';
    cta.addEventListener('click', () => onSelectPlan(plan.id));

    card.append(title, subtitle, summary, stats, requirements, cta);
    grid.appendChild(card);
  });

  section.append(intro, grid);
  return section;
}
