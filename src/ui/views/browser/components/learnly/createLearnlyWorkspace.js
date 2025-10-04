import { createLearnlyWorkspacePresenter } from './createLearnlyWorkspacePresenter.js';

export function createLearnlyWorkspace() {
  const orchestrator = createLearnlyWorkspacePresenter();

  return {
    render(model = {}, context = {}) {
      return orchestrator.render(model, context);
    }
  };
}

