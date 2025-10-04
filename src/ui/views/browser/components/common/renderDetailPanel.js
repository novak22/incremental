import { appendContent } from './domHelpers.js';

const DEFAULT_THEME = {
  container: 'asset-detail',
  header: 'asset-detail__header',
  title: 'asset-detail__title',
  subtitle: 'asset-detail__subtitle',
  status: 'asset-detail__status',
  tabs: 'asset-detail__tabs',
  stats: 'asset-detail__stats',
  stat: 'asset-detail__stat',
  statLabel: 'asset-detail__stat-label',
  statValue: 'asset-detail__stat-value',
  statNote: 'asset-detail__stat-note',
  sections: 'asset-detail__sections',
  section: 'asset-detail__section',
  sectionTitle: 'asset-detail__section-title',
  sectionBody: 'asset-detail__section-body',
  actions: 'asset-detail__actions',
  actionButton: 'asset-detail__action',
  empty: 'asset-detail__empty'
};

function applyDataset(element, dataset = {}) {
  if (!element || !dataset || typeof dataset !== 'object') return;
  Object.entries(dataset).forEach(([key, value]) => {
    if (value != null) {
      element.dataset[key] = String(value);
    }
  });
}

function renderStats(stats = [], theme) {
  if (!Array.isArray(stats) || stats.length === 0) {
    return null;
  }
  const list = document.createElement('div');
  list.className = theme.stats;
  stats.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('div');
    item.className = entry.className || theme.stat;
    if (entry.tone) {
      item.dataset.tone = String(entry.tone);
    }
    if (entry.dataset) {
      applyDataset(item, entry.dataset);
    }
    const label = document.createElement('span');
    label.className = theme.statLabel;
    appendContent(label, entry.label ?? '');
    const value = document.createElement('strong');
    value.className = theme.statValue;
    appendContent(value, entry.value ?? '');
    item.append(label, value);
    if (entry.note) {
      const note = document.createElement('span');
      note.className = theme.statNote;
      appendContent(note, entry.note);
      item.appendChild(note);
    }
    list.appendChild(item);
  });
  return list;
}

function renderSections(sections = [], theme, context) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.className = theme.sections;
  sections.forEach(section => {
    if (!section) return;
    const article = document.createElement('section');
    article.className = section.className || theme.section;
    if (section.tone) {
      article.dataset.tone = String(section.tone);
    }
    if (section.dataset) {
      applyDataset(article, section.dataset);
    }
    if (section.title) {
      const heading = document.createElement('h3');
      heading.className = theme.sectionTitle;
      appendContent(heading, section.title);
      article.appendChild(heading);
    }
    if (typeof section.render === 'function') {
      const result = section.render({ section, theme, article, context }) ?? null;
      appendContent(article, result);
    } else {
      if (section.body) {
        const body = document.createElement('p');
        body.className = theme.sectionBody;
        appendContent(body, section.body);
        article.appendChild(body);
      }
      if (Array.isArray(section.items)) {
        const list = document.createElement('ul');
        list.className = `${theme.sectionBody} ${theme.sectionBody}--list`.trim();
        section.items.forEach(item => {
          const li = document.createElement('li');
          appendContent(li, item);
          list.appendChild(li);
        });
        article.appendChild(list);
      }
      if (section.footer) {
        const footer = document.createElement('footer');
        appendContent(footer, section.footer);
        article.appendChild(footer);
      }
    }
    if (section.content) {
      appendContent(article, section.content);
    }
    wrapper.appendChild(article);
  });
  return wrapper;
}

function renderActions(actions = [], theme, context = {}) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }
  const group = document.createElement('div');
  group.className = theme.actions;
  actions.forEach(action => {
    if (!action) return;
    const button = document.createElement('button');
    button.type = action.type || 'button';
    button.className = action.className || theme.actionButton;
    if (action.id) {
      button.id = action.id;
    }
    if (action.disabled) {
      button.disabled = true;
    }
    appendContent(button, action.label ?? '');
    if (typeof action.onClick === 'function') {
      button.addEventListener('click', event => {
        event.preventDefault();
        if (button.disabled) return;
        action.onClick(context, event);
      });
    }
    group.appendChild(button);
  });
  return group;
}

function renderHeader(header = {}, theme) {
  if (!header.title && !header.subtitle && !header.status) {
    return null;
  }
  const wrapper = document.createElement('header');
  wrapper.className = theme.header;
  if (header.title) {
    const title = document.createElement('h2');
    title.className = theme.title;
    appendContent(title, header.title);
    wrapper.appendChild(title);
  }
  if (header.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = theme.subtitle;
    appendContent(subtitle, header.subtitle);
    wrapper.appendChild(subtitle);
  }
  if (header.status) {
    const status = document.createElement('span');
    status.className = header.status.className || theme.status;
    if (header.status.tone) {
      status.dataset.tone = String(header.status.tone);
    }
    if (header.status.dataset) {
      applyDataset(status, header.status.dataset);
    }
    appendContent(status, header.status.label ?? header.status);
    wrapper.appendChild(status);
  }
  if (Array.isArray(header.tabs) && header.tabs.length) {
    const tabs = document.createElement('div');
    tabs.className = theme.tabs;
    header.tabs.forEach(tab => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = tab.label ?? tab;
      if (tab.isActive) {
        button.classList.add('is-active');
        button.disabled = true;
      }
      if (typeof tab.onClick === 'function') {
        button.addEventListener('click', event => {
          event.preventDefault();
          tab.onClick(event, tab);
        });
      }
      tabs.appendChild(button);
    });
    wrapper.appendChild(tabs);
  }
  return wrapper;
}

export function renderDetailPanel(options = {}) {
  const {
    className,
    theme: themeOverride = {},
    isEmpty,
    emptyState,
    header,
    stats,
    sections,
    actions,
    context
  } = options;

  const theme = { ...DEFAULT_THEME, ...themeOverride };
  const container = document.createElement('aside');
  container.className = className || theme.container;

  if (isEmpty) {
    const empty = document.createElement('div');
    empty.className = theme.empty;
    if (emptyState?.title) {
      const title = document.createElement('h3');
      appendContent(title, emptyState.title);
      empty.appendChild(title);
    }
    if (emptyState?.message) {
      const message = document.createElement('p');
      appendContent(message, emptyState.message);
      empty.appendChild(message);
    }
    container.appendChild(empty);
    return container;
  }

  const headerNode = renderHeader(header, theme);
  if (headerNode) {
    container.appendChild(headerNode);
  }

  const statsNode = renderStats(stats, theme);
  if (statsNode) {
    container.appendChild(statsNode);
  }

  const sectionsNode = renderSections(sections, theme, context);
  if (sectionsNode) {
    container.appendChild(sectionsNode);
  }

  const actionsNode = renderActions(actions, theme, context);
  if (actionsNode) {
    container.appendChild(actionsNode);
  }

  return container;
}

