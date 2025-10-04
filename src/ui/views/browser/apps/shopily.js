import shopilyApp from '../components/shopily.js';
import { createWorkspaceRenderer } from '../utils/workspaceFactories.js';

const renderShopilyWorkspace = createWorkspaceRenderer({
  pageType: 'shopily',
  mountRole: 'shopily-root',
  renderApp: (model, options) => shopilyApp.render(model, options),
  fallbackMeta: 'Launch your first store',
});

export default function renderShopily(context = {}, definitions = [], model = {}) {
  return renderShopilyWorkspace(context, definitions, model);
}
