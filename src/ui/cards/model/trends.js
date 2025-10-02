import { getState } from '../../../core/state.js';
import { buildNicheViewModel } from '../../dashboard/model.js';

const DEFAULT_MODEL = {
  highlights: {
    hot: { title: 'No readings yet', note: 'Assign a niche to start tracking buzz.' },
    swing: { title: 'Awaiting data', note: 'Fresh deltas will appear after the first reroll.' },
    risk: { title: 'All calm', note: 'We’ll flag niches that are cooling off fast.' }
  },
  board: {
    entries: [],
    emptyMessages: {
      default: 'Assign a niche to a venture to start tracking demand swings.',
      investedOnly: 'You haven’t assigned any assets that fit this filter yet.',
      watchlistOnly: 'No watchlisted niches match the current filters.'
    }
  },
  watchlistCount: 0
};

export default function buildTrendsModel(state = getState()) {
  const sourceState = state || getState();
  const model = buildNicheViewModel(sourceState);
  if (model && typeof model === 'object') {
    return model;
  }
  return DEFAULT_MODEL;
}
