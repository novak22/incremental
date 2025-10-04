export const filterState = {
  sort: 'momentum',
  view: 'all',
  search: '',
  rawSearch: ''
};

let rootNode = null;
let refs = null;
let currentModel = null;

function ensureRefs() {
  if (refs) return refs;
  refs = {
    header: {
      searchInput: null,
      sortSelect: null,
      viewButtons: {}
    },
    overview: {
      topBoost: {},
      biggestDrop: {},
      bestPayout: {},
      activeCount: {}
    },
    grid: {
      container: null,
      empty: null,
      footer: null,
      meta: null
    },
    watchlist: {
      container: null,
      section: null,
      empty: null,
      meta: null
    },
    footerNote: null
  };
  return refs;
}

export function getRefs() {
  return ensureRefs();
}

export function ensureRoot(mount, buildLayout) {
  if (!rootNode) {
    rootNode = document.createElement('div');
    rootNode.className = 'trends-app';
    buildLayout(rootNode);
  }

  if (rootNode.parentElement !== mount) {
    mount.innerHTML = '';
    mount.appendChild(rootNode);
  }

  return rootNode;
}

export function getCurrentModel() {
  return currentModel;
}

export function setCurrentModel(model) {
  currentModel = model;
}

export function getWatchlistCount() {
  return currentModel?.watchlistCount || 0;
}

export function updateEntryWatchlist(nicheId, watchlisted) {
  if (!nicheId || !currentModel?.entries) return;
  currentModel.entries.forEach(entry => {
    if (entry?.id === nicheId) {
      entry.watchlisted = watchlisted;
    }
  });
  currentModel.watchlistCount = currentModel.entries.filter(entry => entry.watchlisted).length;
}
