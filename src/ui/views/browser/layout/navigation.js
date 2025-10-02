import { HOMEPAGE_ID } from '../config.js';

function removeFromArray(array, value) {
  const index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

export function createNavigationController({ homepageId = HOMEPAGE_ID } = {}) {
  let currentPage = homepageId;
  const historyStack = [];
  const futureStack = [];

  function getCurrentPage() {
    return currentPage;
  }

  function handleNavigation(pageId, { recordHistory = true } = {}) {
    if (!pageId) return currentPage;
    if (recordHistory && currentPage !== pageId) {
      historyStack.push(currentPage);
      futureStack.length = 0;
    }
    currentPage = pageId;
    return currentPage;
  }

  function navigateBack(onNavigate) {
    if (!historyStack.length) return false;
    const previous = historyStack.pop();
    futureStack.push(currentPage);
    if (typeof onNavigate === 'function') {
      onNavigate(previous);
    }
    return true;
  }

  function navigateForward(onNavigate) {
    if (!futureStack.length) return false;
    const next = futureStack.pop();
    historyStack.push(currentPage);
    if (typeof onNavigate === 'function') {
      onNavigate(next);
    }
    return true;
  }

  function purge(pageId) {
    if (!pageId) return;
    removeFromArray(historyStack, pageId);
    removeFromArray(futureStack, pageId);
    if (currentPage === pageId) {
      currentPage = homepageId;
    }
  }

  function parseAddressValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const pattern = /^(?:https?:\/\/)?([^/]+)(?:\/(.*))?$/i;
    const match = pattern.exec(raw);
    if (!match) return null;

    const host = match[1].toLowerCase();
    const remainder = String(match[2] || '')
      .trim()
      .split(/[?#]/, 1)[0]
      .replace(/^\/+|\/+$/g, '');

    if (host === 'hustle.city') {
      if (!remainder) {
        return { pageId: homepageId };
      }
      const [slug] = remainder.split('/');
      return { slug };
    }

    if (host.endsWith('.hub')) {
      const workspace = host.slice(0, -4);
      return { slug: workspace, path: remainder };
    }

    if (!host.includes('.')) {
      return { slug: host };
    }

    return null;
  }

  function updateButtons({ backButton, forwardButton } = {}) {
    if (backButton) {
      backButton.disabled = historyStack.length === 0;
    }
    if (forwardButton) {
      forwardButton.disabled = futureStack.length === 0;
    }
  }

  function createAddressSubmitHandler({
    getValue,
    setValue,
    onNavigate,
    findPageById,
    findPageBySlug,
    formatAddress
  }) {
    return event => {
      event.preventDefault();
      const inputValue = typeof getValue === 'function' ? getValue() : '';
      const target = parseAddressValue(inputValue);
      if (!target) {
        const current = findPageById?.(currentPage);
        if (current && typeof setValue === 'function' && typeof formatAddress === 'function') {
          setValue(formatAddress(current));
        }
        return;
      }

      if (target.pageId) {
        onNavigate?.(target.pageId);
        return;
      }

      const destination = target.slug ? findPageBySlug?.(target.slug) : null;
      if (destination) {
        onNavigate?.(destination.id, target);
        return;
      }

      const current = findPageById?.(currentPage);
      if (current && typeof setValue === 'function' && typeof formatAddress === 'function') {
        setValue(formatAddress(current));
      }
    };
  }

  return {
    getCurrentPage,
    handleNavigation,
    navigateBack,
    navigateForward,
    purge,
    parseAddressValue,
    updateButtons,
    createAddressSubmitHandler
  };
}

const navigation = { createNavigationController };

export default navigation;
