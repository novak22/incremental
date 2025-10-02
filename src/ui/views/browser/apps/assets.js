import { formatHours } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';
import { createStat } from '../components/widgets.js';

function renderAssetInstances(group, container) {
  const wrapper = document.createElement('article');
  wrapper.className = 'browser-card browser-card--asset-group';
  wrapper.dataset.assetGroup = group.id;

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = `${group.icon || '✨'} ${group.label}`.trim();
  header.appendChild(title);
  container.appendChild(wrapper);
  wrapper.appendChild(header);

  if (group.note) {
    const note = document.createElement('p');
    note.className = 'browser-card__summary';
    note.textContent = group.note;
    wrapper.appendChild(note);
  }

  const list = document.createElement('div');
  list.className = 'browser-asset-list';
  list.dataset.role = 'browser-asset-list';
  wrapper.appendChild(list);

  group.instances.forEach(instance => {
    const item = document.createElement('div');
    item.className = 'browser-asset';
    item.dataset.asset = instance.id;
    item.dataset.status = instance.status || 'setup';
    item.dataset.risk = instance.risk || 'medium';
    if (instance.needsMaintenance) {
      item.dataset.needsMaintenance = 'true';
    }

    const label = document.createElement('strong');
    label.className = 'browser-asset__title';
    const assetName = instance.definition?.singular || instance.definition?.name || 'Venture';
    label.textContent = `${assetName} #${instance.index + 1}`;

    const status = document.createElement('span');
    status.className = 'browser-asset__status';
    status.textContent = instance.status === 'active' ? 'Active' : 'Setting up';

    const maintenance = document.createElement('span');
    maintenance.className = 'browser-asset__note';
    maintenance.textContent = instance.needsMaintenance ? 'Maintenance due' : 'All clear';

    item.append(label, status, maintenance);
    list.appendChild(item);
  });

  return wrapper;
}

function renderAssetLaunchers(launchers = [], container) {
  if (!launchers.length) return;
  const launcherSection = document.createElement('div');
  launcherSection.className = 'browser-launcher-grid';

  launchers.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'browser-card browser-card--launcher';
    card.dataset.assetLauncher = entry.id;

    const header = document.createElement('header');
    header.className = 'browser-card__header';
    const title = document.createElement('h2');
    title.className = 'browser-card__title';
    title.textContent = entry.name;
    header.appendChild(title);
    card.appendChild(header);

    if (entry.summary) {
      const summary = document.createElement('p');
      summary.className = 'browser-card__summary';
      summary.textContent = entry.summary;
      card.appendChild(summary);
    }

    const stats = document.createElement('div');
    stats.className = 'browser-card__stats';
    stats.append(
      createStat('Setup', `${formatHours(entry.setup?.hoursPerDay || 0)} • ${entry.setup?.days || 0} day${entry.setup?.days === 1 ? '' : 's'}`),
      createStat('Upkeep', entry.upkeep || 'No upkeep')
    );
    card.appendChild(stats);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-card__button browser-card__button--primary';
    button.textContent = entry.action?.label || 'Launch';
    button.disabled = Boolean(entry.action?.disabled);
    button.addEventListener('click', () => {
      if (button.disabled) return;
      entry.action?.onClick?.();
    });

    const actions = document.createElement('div');
    actions.className = 'browser-card__actions';
    actions.appendChild(button);
    card.appendChild(actions);

    launcherSection.appendChild(card);
  });

  container.appendChild(launcherSection);
}

export default function renderAssets(context = {}, definitions = [], models = {}) {
  const page = getPageByType('assets');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    body.innerHTML = '';
  });
  if (!refs) return null;

  const groups = Array.isArray(models.groups) ? models.groups : [];
  const launchers = Array.isArray(models.launchers) ? models.launchers : [];
  let activeCount = 0;

  if (groups.length) {
    const groupGrid = document.createElement('div');
    groupGrid.className = 'browser-card-column';
    groups.forEach(group => {
      activeCount += group.instances.filter(instance => instance.status === 'active').length;
      renderAssetInstances(group, groupGrid);
    });
    refs.body.appendChild(groupGrid);
  }

  if (launchers.length) {
    renderAssetLaunchers(launchers, refs.body);
  }

  if (!refs.body.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'No ventures discovered yet. Launch your first asset to fill this feed.';
    refs.body.appendChild(empty);
  }

  return {
    id: page.id,
    meta: activeCount > 0 ? `${activeCount} active venture${activeCount === 1 ? '' : 's'}` : 'No active ventures yet'
  };
}
