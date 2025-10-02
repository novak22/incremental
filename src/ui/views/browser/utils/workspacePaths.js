export function createWorkspacePathController({ derivePath }) {
  if (typeof derivePath !== 'function') {
    throw new TypeError('derivePath must be a function');
  }

  let lastPath = undefined;
  let listener = null;

  function setListener(fn) {
    listener = typeof fn === 'function' ? fn : null;
  }

  function sync(options = {}) {
    const { force = false } = options;
    const nextPath = derivePath();
    const changed = nextPath !== lastPath;
    if ((force || changed) && listener) {
      listener(nextPath);
    }
    lastPath = nextPath;
    return nextPath;
  }

  function getPath() {
    if (lastPath === undefined) {
      lastPath = derivePath();
    }
    return lastPath;
  }

  return {
    setListener,
    sync,
    getPath
  };
}

export default {
  createWorkspacePathController
};
