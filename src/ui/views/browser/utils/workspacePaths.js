/**
 * Builds a lightweight controller that tracks the current workspace path.
 *
 * @param {Object} options
 * @param {() => string} options.derivePath - Computes the latest path.
 * @param {(path: string) => void} [options.listener] - Optional initial listener.
 */
export function createWorkspacePathController({ derivePath, listener: initialListener } = {}) {
  if (typeof derivePath !== 'function') {
    throw new TypeError('derivePath must be a function');
  }

  let lastPath = undefined;
  let listener = typeof initialListener === 'function' ? initialListener : null;

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

