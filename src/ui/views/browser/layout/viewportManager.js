export function createViewportManager({ windowRef = typeof window !== 'undefined' ? window : null, documentRef = typeof document !== 'undefined' ? document : null } = {}) {
  function scrollToTop({ smooth = false } = {}) {
    if (!windowRef && !documentRef) return;

    const behavior = smooth ? 'smooth' : 'auto';

    if (windowRef && typeof windowRef.scrollTo === 'function') {
      try {
        windowRef.scrollTo({ top: 0, behavior });
        return;
      } catch (error) {
        windowRef.scrollTo(0, 0);
        return;
      }
    }

    if (!documentRef) return;

    if (documentRef.documentElement) {
      documentRef.documentElement.scrollTop = 0;
    }

    if (documentRef.body) {
      documentRef.body.scrollTop = 0;
    }
  }

  return {
    scrollToTop
  };
}

