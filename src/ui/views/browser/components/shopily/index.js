import { createShopilyWorkspacePresenter } from './createShopilyWorkspace.js';

const presenter = createShopilyWorkspacePresenter();

export default function renderShopilyWorkspace(model = {}, context = {}) {
  return presenter.render(model, context);
}
