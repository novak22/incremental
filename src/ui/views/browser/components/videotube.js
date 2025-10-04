import { createVideoTubeWorkspace } from './videotube/createVideoTubeWorkspace.js';

const presenter = createVideoTubeWorkspace();

export function render(model = {}, context = {}) {
  return presenter.render(model, context);
}

export default {
  render
};
