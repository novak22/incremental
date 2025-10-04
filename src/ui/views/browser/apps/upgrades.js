import shopstackApp from '../components/shopstack/index.js';
import { createWorkspaceRenderer } from '../utils/workspaceFactories.js';

const renderShopstackWorkspace = createWorkspaceRenderer({
  pageType: 'upgrades',
  mountRole: 'shopstack-root',
  renderApp: (models, options) => shopstackApp.render(models, options),
  buildRenderOptions: ({ mount, page, definitions, onRouteChange }) => ({
    mount,
    page,
    definitions,
    onRouteChange,
  }),
  deriveMeta: ({ summary, model, fallback }) =>
    summary?.meta || model?.overview?.note || model?.summary?.meta || fallback || '',
  fallbackMeta: 'Browse upgrades for upcoming boosts',
});

export default function renderUpgrades(context = {}, definitions = [], models = {}) {
  return renderShopstackWorkspace(context, definitions, models);
}
