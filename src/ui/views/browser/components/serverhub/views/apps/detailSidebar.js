function createStat(label, value, note = '') {
  const item = document.createElement('div');
  item.className = 'serverhub-detail__stat';

  const title = document.createElement('span');
  title.className = 'serverhub-detail__stat-label';
  title.textContent = label;

  const amount = document.createElement('strong');
  amount.className = 'serverhub-detail__stat-value';
  amount.textContent = value;

  item.append(title, amount);

  if (note) {
    const noteEl = document.createElement('span');
    noteEl.className = 'serverhub-detail__stat-note';
    noteEl.textContent = note;
    item.appendChild(noteEl);
  }

  return item;
}

export function renderDetailSidebar(model, state, helpers, config = {}) {
  const { getSelectedApp } = helpers;
  const {
    stats = [],
    panels = [],
    footer
  } = config;

  const aside = document.createElement('aside');
  aside.className = 'serverhub-sidebar';

  const instance = getSelectedApp(model, state);
  if (!instance) {
    const empty = document.createElement('div');
    empty.className = 'serverhub-detail__empty';
    empty.textContent = 'Select an app to inspect uptime, payouts, and quality progress.';
    aside.appendChild(empty);
    return aside;
  }

  const header = document.createElement('header');
  header.className = 'serverhub-detail__header';

  const title = document.createElement('h2');
  title.textContent = instance.label;

  const status = document.createElement('span');
  status.className = 'serverhub-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Active';

  header.append(title, status);

  const tabs = document.createElement('div');
  tabs.className = 'serverhub-detail__tabs';

  const overviewTab = document.createElement('button');
  overviewTab.type = 'button';
  overviewTab.className = 'serverhub-detail__tab is-active';
  overviewTab.textContent = 'Overview';
  overviewTab.disabled = true;

  tabs.appendChild(overviewTab);

  const statsContainer = document.createElement('div');
  statsContainer.className = 'serverhub-detail__stats';
  stats.forEach(entry => {
    const value = entry.getValue(instance, helpers);
    const note = typeof entry.getNote === 'function' ? entry.getNote(instance, helpers) : entry.note;
    statsContainer.appendChild(createStat(entry.label, value, note));
  });

  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'serverhub-detail__grid';
  panels.forEach(renderPanel => {
    const panel = renderPanel(instance, helpers);
    if (panel) {
      panelsContainer.appendChild(panel);
    }
  });

  aside.append(header, tabs, statsContainer, panelsContainer);

  if (typeof footer === 'function') {
    const footerNode = footer(instance, helpers);
    if (footerNode) {
      aside.appendChild(footerNode);
    }
  }

  return aside;
}

export default renderDetailSidebar;
