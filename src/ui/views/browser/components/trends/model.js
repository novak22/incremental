export function normalizeModel(model = {}) {
  const highlights = model.highlights || {};
  const entries = Array.isArray(model?.board?.entries)
    ? model.board.entries.map(entry => ({
        ...entry,
        popularity: { ...(entry.popularity || {}) },
        definition: { ...(entry.definition || {}) },
        assetBreakdown: Array.isArray(entry?.assetBreakdown)
          ? entry.assetBreakdown.map(item => ({ ...item }))
          : []
      }))
    : [];
  const watchlistCount = Number.isFinite(model.watchlistCount)
    ? model.watchlistCount
    : entries.filter(entry => entry.watchlisted).length;
  const emptyMessages = model?.board?.emptyMessages || {};
  return { highlights, entries, watchlistCount, emptyMessages };
}

export function createMeta(model = {}) {
  const entries = Array.isArray(model.entries) ? model.entries : [];
  if (!entries.length) {
    return 'Trend scan ready';
  }
  const watched = entries.filter(entry => entry.watchlisted).length;
  if (watched) {
    return `${entries.length} niches • ${watched} starred`;
  }
  return `${entries.length} niches tracked`;
}
