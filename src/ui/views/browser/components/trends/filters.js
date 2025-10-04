import { clampScore } from './sparkline.js';

export const SORT_OPTIONS = [
  { key: 'momentum', label: 'Highest Momentum' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'payout', label: 'Payout Impact' },
  { key: 'cooling', label: 'Cooling Off' }
];

export function applyFilters(entries = [], filterState = {}) {
  const search = filterState.search || '';
  return entries.filter(entry => {
    if (filterState.view === 'watchlist' && !entry.watchlisted) {
      return false;
    }
    if (search) {
      const name = String(entry.definition?.name || '').toLowerCase();
      if (!name.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function sortEntries(entries = [], filterState = {}) {
  const sorters = {
    momentum: (a, b) => {
      const scoreA = clampScore(a.popularity?.score) || 0;
      const scoreB = clampScore(b.popularity?.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const deltaA = Number(a.popularity?.delta) || 0;
      const deltaB = Number(b.popularity?.delta) || 0;
      return deltaB - deltaA;
    },
    name: (a, b) => {
      const nameA = String(a.definition?.name || '').toLowerCase();
      const nameB = String(b.definition?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      const scoreA = clampScore(a.popularity?.score) || 0;
      const scoreB = clampScore(b.popularity?.score) || 0;
      return scoreB - scoreA;
    },
    payout: (a, b) => {
      const impactA = Number(a.trendImpact) || 0;
      const impactB = Number(b.trendImpact) || 0;
      if (impactB !== impactA) return impactB - impactA;
      const multiplierA = Number(a.popularity?.multiplier) || 1;
      const multiplierB = Number(b.popularity?.multiplier) || 1;
      return multiplierB - multiplierA;
    },
    cooling: (a, b) => {
      const deltaA = Number(a.popularity?.delta) || 0;
      const deltaB = Number(b.popularity?.delta) || 0;
      if (deltaA !== deltaB) return deltaA - deltaB;
      const impactA = Number(a.trendImpact) || 0;
      const impactB = Number(b.trendImpact) || 0;
      return impactA - impactB;
    }
  };

  const sorter = sorters[filterState.sort] || sorters.momentum;
  return entries.slice().sort(sorter);
}
