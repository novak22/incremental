export const DEFAULT_OVERVIEW = {
  topBoost: { title: 'No boosts yet', note: 'Run hustles to reveal positive swings.' },
  biggestDrop: { title: 'Stable so far', note: 'Downtrends will appear here.' },
  bestPayout: { title: 'No payout spikes yet', note: 'Assign ventures to chase multipliers.' },
  activeCount: { value: 0, note: 'Activate a venture to start the count.' }
};

export function computeOverview(entries = []) {
  if (!entries.length) return DEFAULT_OVERVIEW;

  const byImpactDesc = entries
    .filter(entry => Number.isFinite(Number(entry.trendImpact)))
    .slice()
    .sort((a, b) => Number(b.trendImpact) - Number(a.trendImpact));
  const positive = byImpactDesc.filter(entry => Number(entry.trendImpact) > 0);
  const negative = entries
    .filter(entry => Number(entry.trendImpact) < 0)
    .slice()
    .sort((a, b) => Number(a.trendImpact) - Number(b.trendImpact));
  const bestPayout = entries
    .slice()
    .sort((a, b) => (Number(b.popularity?.multiplier) || 1) - (Number(a.popularity?.multiplier) || 1))[0];
  const activeCount = entries.filter(entry => entry.assetCount > 0).length;

  return {
    topBoost: positive[0] || null,
    biggestDrop: negative[0] || null,
    bestPayout: bestPayout || null,
    activeCount: { value: activeCount }
  };
}

export function updateOverview(entries = [], overviewRefs = {}, { formatPercent, formatSignedCurrency } = {}) {
  const overview = computeOverview(entries);

  const renderEntry = (target, entry, fallback) => {
    if (!target) return;
    if (!entry) {
      target.value.textContent = fallback?.title || '—';
      target.note.textContent = fallback?.note || '';
      return;
    }

    const name = entry.definition?.name || 'Untitled niche';
    if (typeof entry === 'object' && 'value' in entry && !entry.definition) {
      const countValue = Number(entry.value) || 0;
      target.value.textContent = String(countValue);
      target.note.textContent = countValue > 0
        ? entry.note || (countValue === 1 ? 'Active niche today.' : 'Active niches today.')
        : DEFAULT_OVERVIEW.activeCount.note;
      return;
    }

    const impact = Number(entry.trendImpact) || 0;
    const delta = Number(entry.popularity?.delta);
    const multiplier = Number(entry.popularity?.multiplier) || 1;
    const payoutText = formatPercent ? formatPercent(multiplier - 1) : '';
    target.value.textContent = name;

    if (impact > 0) {
      const impactText = formatSignedCurrency ? formatSignedCurrency(impact) : impact;
      target.note.textContent = `${impactText} impact${payoutText ? ` • ${payoutText} payouts` : ''}`;
    } else if (impact < 0) {
      const impactText = formatSignedCurrency ? formatSignedCurrency(impact) : impact;
      target.note.textContent = `${impactText} impact`;
    } else if (Number.isFinite(delta)) {
      target.note.textContent = `${delta > 0 ? '+' : ''}${delta} pts momentum`;
    } else {
      target.note.textContent = payoutText;
    }
  };

  renderEntry(overviewRefs.topBoost, overview.topBoost, DEFAULT_OVERVIEW.topBoost);
  renderEntry(overviewRefs.biggestDrop, overview.biggestDrop, DEFAULT_OVERVIEW.biggestDrop);
  renderEntry(overviewRefs.bestPayout, overview.bestPayout, DEFAULT_OVERVIEW.bestPayout);

  if (overviewRefs.activeCount) {
    const value = Number(overview.activeCount?.value) || 0;
    overviewRefs.activeCount.value.textContent = String(value);
    const label = value === 1 ? 'Active niche today.' : 'Active niches today.';
    overviewRefs.activeCount.note.textContent = value ? label : DEFAULT_OVERVIEW.activeCount.note;
  }
}
