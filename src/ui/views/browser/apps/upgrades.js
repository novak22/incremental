import shopstackApp from '../components/shopstack.js';
import { setWorkspacePath } from '../layoutPresenter.js';
import { getPageByType } from './pageLookup.js';

export default function renderUpgrades(context = {}, definitions = [], models = {}) {
  const page = getPageByType('upgrades');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="shopstack-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'shopstack-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="shopstack-root"]');
  if (!mount) return null;

  const handleRouteChange = path => {
    setWorkspacePath(page.id, path);
  };

  const summary = shopstackApp.render(models, {
    mount,
    page,
    definitions,
    onRouteChange: handleRouteChange
  });
  const path = summary?.urlPath || '';
  setWorkspacePath(page.id, path);
  const meta = summary?.meta || models?.overview?.note || 'Browse upgrades for upcoming boosts';
  return { id: page.id, meta, urlPath: path };
}
