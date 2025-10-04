const KPI_THEME = {
  container: 'videotube-stats',
  grid: 'videotube-stats__grid',
  card: 'videotube-stats__card',
  label: 'videotube-stats__label',
  value: 'videotube-stats__value',
  note: 'videotube-stats__note',
  empty: 'videotube-stats__empty'
};

function mapHeroStats(stats = {}, helpers = {}) {
  const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
  const formatPercent = helpers.formatPercent || (value => String(value ?? ''));

  return [
    { id: 'lifetime', label: 'Total earned', value: formatCurrency(stats.lifetime || 0) },
    { id: 'daily', label: 'Daily payout', value: formatCurrency(stats.daily || 0) },
    { id: 'active', label: 'Active uploads', value: stats.active || 0 },
    { id: 'momentum', label: 'Milestone progress', value: formatPercent(stats.milestonePercent || 0) }
  ];
}

export { KPI_THEME, mapHeroStats };

export default {
  KPI_THEME,
  mapHeroStats
};
