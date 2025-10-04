import { setWorkspacePath } from '../layoutPresenter.js';
import { getPageByType } from '../apps/pageLookup.js';

function ensureWorkspaceMount({ body, role }) {
  if (!body) return null;
  let mount = body.querySelector(`[data-role="${role}"]`);
  if (!mount) {
    body.innerHTML = '';
    mount = document.createElement('div');
    mount.dataset.role = role;
    body.appendChild(mount);
  }
  return mount;
}

function defaultDeriveMeta({ summary, model, fallback }) {
  return summary?.meta || model?.summary?.meta || fallback || '';
}

export function createWorkspaceRenderer({
  pageType,
  mountRole,
  renderApp,
  buildRenderOptions,
  deriveMeta = defaultDeriveMeta,
  prepareBody,
  fallbackMeta,
}) {
  if (!pageType) throw new Error('createWorkspaceRenderer requires a pageType');
  if (!mountRole) throw new Error('createWorkspaceRenderer requires a mountRole');
  if (typeof renderApp !== 'function') throw new Error('createWorkspaceRenderer requires a renderApp function');

  return function renderWorkspace(context = {}, definitions = [], model = {}) {
    const page = getPageByType(pageType);
    if (!page) return null;

    const refs = context.ensurePageContent?.(page, ({ body }) => {
      const mount = ensureWorkspaceMount({ body, role: mountRole });
      if (mount && typeof prepareBody === 'function') {
        prepareBody({
          body,
          mount,
          page,
          context,
          definitions,
          model,
        });
      }
    });
    if (!refs) return null;

    const mount = refs.body.querySelector(`[data-role="${mountRole}"]`);
    if (!mount) return null;

    const handleRouteChange = path => {
      setWorkspacePath(page.id, path);
    };

    const renderOptions = typeof buildRenderOptions === 'function'
      ? buildRenderOptions({
          context,
          definitions,
          model,
          page,
          mount,
          onRouteChange: handleRouteChange,
        })
      : { mount, page, onRouteChange: handleRouteChange };

    const summary = renderApp(model, renderOptions);
    const path = summary?.urlPath || '';
    setWorkspacePath(page.id, path);

    const meta = deriveMeta({
      summary,
      model,
      definitions,
      page,
      context,
      fallback: fallbackMeta,
    });

    return { id: page.id, meta, urlPath: path };
  };
}

export { ensureWorkspaceMount };
