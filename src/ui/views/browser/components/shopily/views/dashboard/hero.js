const KPI_THEME = {
  container: 'shopily-metrics',
  grid: 'shopily-metrics__grid',
  card: 'shopily-metric',
  label: 'shopily-metric__label',
  value: 'shopily-metric__value',
  note: 'shopily-metric__note',
  empty: 'shopily-metrics__empty'
};

function describeMetricTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

export function mapHeroMetrics(metrics = {}, formatters = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? '')
  } = formatters;
  return [
    {
      id: 'totalStores',
      label: 'Total Stores',
      value: metrics.totalStores || 0,
      note: 'Active & in setup',
      tone: 'neutral'
    },
    {
      id: 'dailySales',
      label: 'Daily Sales',
      value: formatCurrency(metrics.dailySales || 0),
      note: 'Yesterday’s payouts',
      tone: describeMetricTone(metrics.dailySales)
    },
    {
      id: 'dailyUpkeep',
      label: 'Daily Upkeep',
      value: formatCurrency(metrics.dailyUpkeep || 0),
      note: 'Cash needed each day',
      tone: describeMetricTone(-(metrics.dailyUpkeep || 0))
    },
    {
      id: 'netDaily',
      label: 'Net / Day',
      value: formatSignedCurrency(metrics.netDaily || 0),
      note: 'Sales minus upkeep',
      tone: describeMetricTone(metrics.netDaily)
    }
  ];
}

export default function renderHero(model, dependencies = {}) {
  const {
    formatters = {},
    createLaunchButton = () => document.createElement('button'),
    renderKpiGrid
  } = dependencies;

  const hero = document.createElement('section');
  hero.className = 'shopily-hero';

  const body = document.createElement('div');
  body.className = 'shopily-hero__body';

  const headline = document.createElement('h2');
  headline.textContent = 'Your store, your brand, powered by Shopily.';
  const summary = document.createElement('p');
  summary.textContent =
    model.summary?.meta || 'Launch your first storefront to kick off the commerce flywheel.';

  const ctaRow = document.createElement('div');
  ctaRow.className = 'shopily-hero__cta';
  ctaRow.appendChild(createLaunchButton(model.launch));

  body.append(headline, summary, ctaRow);
  hero.append(body, renderKpiGrid({ items: mapHeroMetrics(model.metrics, formatters), theme: KPI_THEME }));
  return hero;
}
