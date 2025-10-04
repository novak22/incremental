import digishelfApp from '../components/digishelf.js';
import { createWorkspaceRenderer } from '../utils/workspaceFactories.js';

const renderDigishelfWorkspace = createWorkspaceRenderer({
  pageType: 'digishelf',
  mountRole: 'digishelf-root',
  renderApp: (model, options) => digishelfApp.render(model, options),
  buildRenderOptions: ({ mount, page, definitions, onRouteChange }) => ({
    mount,
    page,
    definitions,
    onRouteChange,
  }),
  fallbackMeta: 'Publish your first resource',
});

export default function renderDigishelf(context = {}, definitions = [], model = {}) {
  return renderDigishelfWorkspace(context, definitions, model);
}
