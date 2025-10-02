import { getState } from '../../../../core/state.js';
import { buildPlayerPanelModel } from '../../../player/model.js';
import { computeDailySummary } from '../../../../game/summary.js';
import yourNetworkApp from '../components/yournetwork.js';
import { getPageByType } from './pageLookup.js';

export default function renderYourNetwork(context = {}, models = {}) {
  const page = getPageByType('profile');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="yournetwork-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'yournetwork-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="yournetwork-root"]');
  if (!mount) return null;

  const state = getState();
  const profile = buildPlayerPanelModel(state);
  const dailySummary = computeDailySummary(state);
  const summary = yourNetworkApp.render({
    mount,
    profile,
    assetsModel: models.assets,
    state,
    dailySummary
  });

  const meta = summary?.meta || profile?.summary?.title || profile?.summary?.tier || 'Profile ready';
  return { id: page.id, meta };
}
