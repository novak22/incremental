import { createLearnlyWorkspace } from './learnly/createLearnlyWorkspace.js';

const workspace = createLearnlyWorkspace();

export default function renderLearnlyWorkspace(model = {}, context = {}) {
  return workspace.render(model, context);
}
