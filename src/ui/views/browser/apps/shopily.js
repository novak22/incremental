import renderShopilyWorkspace from '../components/shopily.js';
import { setWorkspacePath } from '../layoutPresenter.js';
import { getPageByType } from './pageLookup.js';

export default function renderShopily(context = {}, definitions = [], model = {}) {
  const page = getPageByType('shopily');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="shopily-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'shopily-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="shopily-root"]');
  if (!mount) return null;

  const handleRouteChange = path => {
    setWorkspacePath(page.id, path);
  };
  const summary = renderShopilyWorkspace(model, { mount, page, onRouteChange: handleRouteChange });
  const path = summary?.urlPath || '';
  setWorkspacePath(page.id, path);
  const meta = summary?.meta || model?.summary?.meta || 'Launch your first store';
  return { id: page.id, meta, urlPath: path };
}
