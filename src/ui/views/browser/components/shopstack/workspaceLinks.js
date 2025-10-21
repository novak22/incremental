const DEFAULT_WORKSPACE_LINKS = [
  { id: 'downwork', label: 'DownWork' },
  { id: 'shopily', label: 'Shopily' },
  { id: 'blogpress', label: 'BlogPress' },
  { id: 'videotube', label: 'VideoTube' }
];

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

export function createWorkspaceLink(entry) {
  const descriptor = typeof entry === 'string' ? WORKSPACE_LINK_MAP.get(entry) : entry;
  if (!descriptor) {
    return null;
  }
  const link = document.createElement('a');
  link.href = `https://${descriptor.id}.hub/`;
  link.dataset.siteTarget = descriptor.id;
  link.className = 'shopstack__workspace-link';
  link.textContent = descriptor.label;
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
