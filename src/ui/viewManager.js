import elementRegistry from './elements/registry.js';

let activeView = null;

export function setActiveView(view, rootDocument = typeof document !== 'undefined' ? document : null) {
  activeView = {
    ...view,
    root: rootDocument
  };

  const resolvers = view?.resolvers ?? {};
  elementRegistry.initialize(rootDocument, resolvers);

  if (typeof view?.onActivate === 'function') {
    view.onActivate({ root: rootDocument });
  }

  return activeView;
}

export function getActiveView() {
  return activeView;
}

export default {
  setActiveView,
  getActiveView
};
