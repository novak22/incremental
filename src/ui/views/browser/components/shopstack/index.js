import { createShopStackWorkspacePresenter } from './createShopStackWorkspace.js';

const presenter = createShopStackWorkspacePresenter();

function render(model = {}, context = {}) {
  return presenter.render(model, context);
}

export default {
  render
};

export { render, createShopStackWorkspacePresenter };
