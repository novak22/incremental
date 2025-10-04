import { ensureArray } from '../../../../../../core/helpers.js';

function formatPlanPayout(payoutRange = {}, formatCurrency) {
  const min = Math.max(0, Number(payoutRange.min) || 0);
  const max = Math.max(0, Number(payoutRange.max) || 0);
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

export function createPricingView({ formatCurrency, formatHours }) {
  return function renderPricingView({ model = {} }) {
    const container = document.createElement('section');
    container.className = 'serverhub-view serverhub-view--pricing';
    const intro = document.createElement('div');
    intro.className = 'serverhub-pricing__intro';
    intro.innerHTML = '<h2>Hosting plans</h2><p>Choose the scale profile that matches your roadmap. All plans reuse the existing micro SaaS backend logic.</p>';
    container.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'serverhub-pricing';
    const plans = ensureArray(model.pricing);
    plans.forEach(plan => {
      const card = document.createElement('article');
      card.className = 'serverhub-plan';
      const header = document.createElement('header');
      const title = document.createElement('h3');
      title.textContent = plan.title;
      header.appendChild(title);
      const summary = document.createElement('p');
      summary.className = 'serverhub-plan__summary';
      summary.textContent = plan.summary;

      const list = document.createElement('ul');
      list.className = 'serverhub-plan__list';
      [
        { label: 'Setup cost', value: formatCurrency(plan.setup?.cost || 0) },
        {
          label: 'Setup time',
          value: `${plan.setup?.days || 0} day${plan.setup?.days === 1 ? '' : 's'} • ${formatHours(plan.setup?.hoursPerDay || 0)}/day`
        },
        {
          label: 'Daily upkeep',
          value: `${formatCurrency(plan.upkeep?.cost || 0)} • ${formatHours(plan.upkeep?.hours || 0)}`
        },
        { label: 'Projected daily payout', value: formatPlanPayout(plan.payout, formatCurrency) }
      ].forEach(entry => {
        const item = document.createElement('li');
        item.className = 'serverhub-plan__item';
        const label = document.createElement('span');
        label.className = 'serverhub-plan__label';
        label.textContent = entry.label;
        const value = document.createElement('span');
        value.className = 'serverhub-plan__value';
        value.textContent = entry.value;
        item.append(label, value);
        list.appendChild(item);
      });

      card.append(header, summary, list);
      grid.appendChild(card);
    });

    if (!plans.length) {
      const empty = document.createElement('p');
      empty.className = 'serverhub-empty';
      empty.textContent = 'Pricing details unlock after discovering the micro SaaS asset.';
      grid.appendChild(empty);
    }

    container.appendChild(grid);
    return container;
  };
}

export default {
  createPricingView
};
