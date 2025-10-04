import { createShopilyWorkspacePresenter } from './createShopilyWorkspace.js';

const presenter = createShopilyWorkspacePresenter();

function render(model = {}, context = {}) {
  return presenter.render(model, context);
}

export default {
  render
};

export { render };
