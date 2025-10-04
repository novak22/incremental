import { createLearnlyWorkspace } from './learnly/createLearnlyWorkspace.js';

const workspace = createLearnlyWorkspace();

export function render(model = {}, context = {}) {
  return workspace.render(model, context);
}

export default { render };
