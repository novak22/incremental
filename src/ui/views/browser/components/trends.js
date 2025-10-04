import { setNicheWatchlist } from '../../../../game/assets/niches.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../utils/formatting.js';
import {
  filterState,
  ensureRoot,
  getCurrentModel,
  getRefs,
  getWatchlistCount,
  setCurrentModel,
  updateEntryWatchlist
} from './trends/state.js';
import { updateOverview } from './trends/overview.js';
import { createLayoutBuilder, updateToolbarState } from './trends/layout.js';
import { applyFilters, sortEntries } from './trends/filters.js';
import { renderGrid, renderWatchlist } from './trends/renderers/board.js';
import { normalizeModel, createMeta } from './trends/model.js';

const refs = getRefs();

const formatPercent = value =>
  baseFormatPercent(value, { nullFallback: '0%', signDisplay: 'always' });

const formatCurrency = amount =>
  baseFormatCurrency(amount, { absolute: true, precision: 'cent', signDisplay: 'never' });

const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });

function renderContent() {
  const currentModel = getCurrentModel();
  if (!currentModel) return;
  if (currentModel.watchlistCount === 0 && filterState.view === 'watchlist') {
    filterState.view = 'all';
  }
  updateToolbarState(refs, filterState, getWatchlistCount());
  updateOverview(currentModel.entries, refs.overview, {
    formatPercent,
    formatSignedCurrency
  });
  const filtered = applyFilters(currentModel.entries, filterState);
  const sorted = sortEntries(filtered, filterState);
  renderGrid(sorted, { refs, filterState, formatCurrency, formatPercent });
  renderWatchlist(currentModel.entries, { refs, formatCurrency, formatPercent });
}

function handleRootClick(event) {
  const button = event.target.closest('[data-trends-action]');
  if (!button) return;
  const action = button.dataset.trendsAction;
  const nicheId = button.dataset.niche;
  if (action !== 'watchlist' || !nicheId) return;
  event.preventDefault();
  const shouldWatch = button.getAttribute('aria-pressed') !== 'true';
  setNicheWatchlist(nicheId, shouldWatch);
  updateEntryWatchlist(nicheId, shouldWatch);
  renderContent();
}

const buildLayout = createLayoutBuilder({
  refs,
  filterState,
  onFiltersChanged: renderContent,
  onAction: handleRootClick
});

function render(model = {}, context = {}) {
  const { mount } = context;
  if (!mount) {
    return { meta: 'Trend scan ready' };
  }
  ensureRoot(mount, buildLayout);
  setCurrentModel(normalizeModel(model));
  renderContent();
  return { meta: createMeta(getCurrentModel()) };
}

export { render };
export default { render };
