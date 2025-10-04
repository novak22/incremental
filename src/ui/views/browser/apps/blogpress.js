import { ensureArray } from '../../../../core/helpers.js';
import { getState } from '../../../../core/state.js';
import formatBlogpressModel from '../../../blogpress/blogModel.js';
import blogpressApp from '../components/blogpress.js';
import { setWorkspacePath } from '../layoutPresenter.js';
import { getPageByType } from './pageLookup.js';

export default function renderBlogpress(context = {}, definitions = [], model = {}) {
  const page = getPageByType('blogpress');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="blogpress-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'blogpress-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="blogpress-root"]');
  if (!mount) return null;

  const definition = ensureArray(definitions).find(entry => entry?.id === 'blog')
    || model.definition
    || null;
  const isLocked = Boolean(model?.lock);
  const formatted = !isLocked && definition
    ? formatBlogpressModel(definition, getState())
    : null;
  const composedModel = {
    ...model,
    definition,
    ...(formatted || {})
  };

  const handleRouteChange = path => {
    setWorkspacePath(page.id, path);
  };
  const summary = blogpressApp.render(composedModel, { mount, page, onRouteChange: handleRouteChange });
  const path = summary?.urlPath || '';
  setWorkspacePath(page.id, path);
  const meta = summary?.meta || composedModel?.summary?.meta || 'Launch your first blog';
  return { id: page.id, meta, urlPath: path };
}
