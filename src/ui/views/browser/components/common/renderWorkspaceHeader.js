import { createNavTabs } from './navBuilders.js';
import { appendContent } from './domHelpers.js';

const DEFAULT_THEME = {
  header: 'asset-workspace__header',
  intro: 'asset-workspace__intro',
  title: 'asset-workspace__title',
  subtitle: 'asset-workspace__subtitle',
  meta: 'asset-workspace__meta',
  badges: 'asset-workspace__badges',
  badge: 'asset-workspace__badge',
  actions: 'asset-workspace__actions',
  actionButton: 'asset-workspace__action',
  nav: 'asset-workspace__tabs'
};

function createActionButton(action = {}, theme) {
  const button = document.createElement('button');
  button.type = action.type || 'button';
  button.className = action.className || theme.actionButton;
  if (action.id) {
    button.id = action.id;
  }
  if (action.title) {
    button.title = action.title;
  }
  if (action['aria-label']) {
    button.setAttribute('aria-label', action['aria-label']);
  } else if (action.ariaLabel) {
    button.setAttribute('aria-label', action.ariaLabel);
  }
  if (action.dataset && typeof action.dataset === 'object') {
    Object.entries(action.dataset).forEach(([key, value]) => {
      if (value != null) {
        button.dataset[key] = String(value);
      }
    });
  }
  if (action.disabled) {
    button.disabled = true;
  }
  appendContent(button, action.label ?? '');
  if (typeof action.onClick === 'function') {
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      action.onClick(event);
    });
  }
  return button;
}

function renderBadges(badges = [], theme) {
  if (!Array.isArray(badges) || badges.length === 0) {
    return null;
  }
  const list = document.createElement('div');
  list.className = theme.badges;
  badges.forEach(badgeConfig => {
    if (!badgeConfig) return;
    const badge = document.createElement('span');
    badge.className = badgeConfig.className || theme.badge;
    if (badgeConfig.id) {
      badge.id = badgeConfig.id;
    }
    if (badgeConfig.tone) {
      badge.dataset.tone = String(badgeConfig.tone);
    }
    appendContent(badge, badgeConfig.label ?? '');
    list.appendChild(badge);
  });
  return list;
}

function resolveNavConfig(nav, theme) {
  if (!nav) {
    return null;
  }
  if (typeof HTMLElement !== 'undefined' && nav instanceof HTMLElement) {
    return nav;
  }
  const config = { navClassName: theme.nav, datasetKey: 'view', withAriaPressed: true, ...nav };
  return createNavTabs(config);
}

export function renderWorkspaceHeader(options = {}) {
  const {
    className,
    title,
    subtitle,
    meta,
    badges,
    actions,
    nav,
    theme: themeOverride = {},
    description
  } = options;

  const theme = { ...DEFAULT_THEME, ...themeOverride };
  const header = document.createElement('header');
  header.className = className || theme.header;

  if (title || subtitle || meta || badges?.length) {
    const intro = document.createElement('div');
    intro.className = theme.intro;

    if (title) {
      const heading = document.createElement('h1');
      heading.className = theme.title;
      appendContent(heading, title);
      intro.appendChild(heading);
    }

    if (subtitle) {
      const subheading = document.createElement('p');
      subheading.className = theme.subtitle;
      appendContent(subheading, subtitle);
      intro.appendChild(subheading);
    }

    const badgeList = renderBadges(badges, theme);
    if (badgeList) {
      intro.appendChild(badgeList);
    }

    if (meta || description) {
      const metaNode = document.createElement('p');
      metaNode.className = theme.meta;
      appendContent(metaNode, meta ?? description ?? '');
      intro.appendChild(metaNode);
    }

    header.appendChild(intro);
  }

  if (Array.isArray(actions) && actions.length) {
    const actionsRow = document.createElement('div');
    actionsRow.className = theme.actions;
    actions.forEach(action => {
      if (!action) return;
      actionsRow.appendChild(createActionButton(action, theme));
    });
    header.appendChild(actionsRow);
  }

  const navNode = resolveNavConfig(nav, theme);
  if (navNode) {
    header.appendChild(navNode);
  }

  return header;
}
