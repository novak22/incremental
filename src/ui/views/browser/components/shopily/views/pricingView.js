import { ensureArray } from '../../../../../../core/helpers.js';

export function renderPlanCard(plan = {}, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    describeSetup = () => 'Instant setup',
    describeUpkeep = () => 'No upkeep'
  } = dependencies;

  const card = document.createElement('article');
  card.className = 'shopily-plan';

  const header = document.createElement('header');
  header.className = 'shopily-plan__header';
  const title = document.createElement('h3');
  title.textContent = plan.name;
  header.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'shopily-plan__summary';
  summary.textContent = plan.summary;

  const list = document.createElement('ul');
  list.className = 'shopily-plan__list';
  const items = [
    { label: 'Setup cost', value: formatCurrency(plan.setupCost || 0) },
    {
      label: 'Setup timeline',
      value: describeSetup({
        days: plan.setupDays,
        hoursPerDay: plan.setupHours
      })
    },
    {
      label: 'Daily upkeep',
      value: describeUpkeep({
        hours: plan.upkeepHours,
        cost: plan.upkeepCost
      })
    },
    { label: 'Expected sales', value: plan.expectedSales || '$0/day' }
  ];

  items.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'shopily-plan__item';
    const label = document.createElement('span');
    label.className = 'shopily-plan__label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'shopily-plan__value';
    value.textContent = entry.value;
    item.append(label, value);
    list.appendChild(item);
  });

  card.append(header, summary, list);
  return card;
}

export default function renderPricingView(options = {}) {
  const {
    model = {},
    formatters = {},
    describeSetup = () => 'Instant setup',
    describeUpkeep = () => 'No upkeep'
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));

  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--pricing';

  const intro = document.createElement('div');
  intro.className = 'shopily-pricing__intro';
  intro.innerHTML = '<h2>Plans & expectations</h2><p>Each tier references the existing dropshipping backend — setup costs, upkeep, and payout ladders stay perfectly in sync.</p>';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'shopily-pricing';

  const plans = ensureArray(model.pricing?.plans);
  if (!plans.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-empty';
    empty.textContent = 'Pricing data unlocks once dropshipping is available.';
    grid.appendChild(empty);
  } else {
    plans.forEach(plan => {
      const card = renderPlanCard(plan, {
        formatCurrency,
        describeSetup,
        describeUpkeep
      });
      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
  return container;
}
