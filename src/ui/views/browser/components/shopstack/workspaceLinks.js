const DEFAULT_WORKSPACE_LINKS = [
  { id: 'downwork', label: 'DownWork' },
  { id: 'shopily', label: 'Shopily' },
  { id: 'blogpress', label: 'BlogPress' },
  { id: 'videotube', label: 'VideoTube' }
];

const WORKSPACE_NAVIGATION_EVENT = 'browser:navigate';

const WORKSPACE_LINK_MAP = new Map(
  DEFAULT_WORKSPACE_LINKS.map(entry => [entry.id, entry])
);

function resolveWorkspaceEntries(ids) {
  const targetIds = Array.isArray(ids) && ids.length
    ? ids
    : DEFAULT_WORKSPACE_LINKS.map(entry => entry.id);
  return targetIds
    .map(entry => {
      if (typeof entry === 'string') {
        return WORKSPACE_LINK_MAP.get(entry) || null;
      }
      if (entry && typeof entry === 'object') {
        return entry;
      }
      return null;
    })
    .filter(Boolean);
}

function dispatchWorkspaceNavigation(control, targetId) {
  if (!control || !targetId) {
    return false;
  }
  const ownerDocument = control.ownerDocument;
  const CustomEventCtor = ownerDocument?.defaultView?.CustomEvent || globalThis.CustomEvent;
  if (typeof CustomEventCtor !== 'function') {
    return false;
  }
  const event = new CustomEventCtor(WORKSPACE_NAVIGATION_EVENT, {
    bubbles: true,
    cancelable: true,
    detail: {
      targetId,
      source: 'shopstack-workspace-link'
    }
  });
  const dispatched = control.dispatchEvent(event);
  return event.defaultPrevented || dispatched === false;
}

function fallbackWorkspaceNavigation(control, targetId) {
  const ownerDocument = control?.ownerDocument;
  if (!ownerDocument || !targetId) {
    return;
  }
  const siteList = ownerDocument.getElementById('browser-site-list');
  const fallbackTarget =
    (siteList && siteList.querySelector(`[data-site-target="${targetId}"]`)) ||
    ownerDocument.querySelector(`[data-role="browser-app-launcher"] [data-site-target="${targetId}"]`);
  if (fallbackTarget && fallbackTarget !== control && fallbackTarget instanceof HTMLElement) {
    fallbackTarget.click();
  }
}

export function createWorkspaceLink(entry) {
  const descriptor = typeof entry === 'string' ? WORKSPACE_LINK_MAP.get(entry) : entry;
  if (!descriptor) {
    return null;
  }
  const link = document.createElement('a');
  link.href = '#';
  link.dataset.siteTarget = descriptor.id;
  link.className = 'shopstack__workspace-link';
  link.textContent = descriptor.label;
  link.addEventListener('click', event => {
    event.preventDefault();
    const targetId = link.dataset.siteTarget || descriptor.id;
    if (!targetId) {
      return;
    }
    const handled = dispatchWorkspaceNavigation(link, targetId);
    if (!handled) {
      fallbackWorkspaceNavigation(link, targetId);
    }
  });
  return link;
}

export function renderWorkspaceLinkList(options = {}) {
  const { ids, conjunction = 'or' } = options;
  const entries = resolveWorkspaceEntries(ids);
  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    const link = createWorkspaceLink(entry);
    if (!link) {
      return;
    }
    if (fragment.childNodes.length) {
      const isLast = index === entries.length - 1;
      const separator = entries.length === 2
        ? ` ${conjunction} `
        : isLast
          ? ` ${conjunction} `
          : ', ';
      fragment.append(separator);
    }
    fragment.appendChild(link);
  });
  return fragment;
}

export default {
  createWorkspaceLink,
  renderWorkspaceLinkList
};
