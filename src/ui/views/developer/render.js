import { formatMoney, formatHours } from '../../../core/helpers.js';
import { getState, getUpgradeState } from '../../../core/state.js';
import { getAssetDefinition } from '../../../core/state/registry.js';
import { getNicheDefinition } from '../../../game/assets/nicheData.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../../game/requirements.js';
import { describeTrackEducationBonuses } from '../../../game/educationEffects.js';
import { getUpgrades } from '../../../game/registryService.js';

function countActiveAssets(state) {
  if (!state?.assets) return 0;
  return Object.values(state.assets).reduce((total, assetState) => {
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const active = instances.filter(instance => instance?.status === 'active').length;
    return total + active;
  }, 0);
}

function formatPercent(value) {
  const numeric = Number(value) * 100;
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.0001) {
    return '0%';
  }
  const precision = Math.abs(numeric) >= 10 ? 0 : 1;
  const rounded = numeric.toFixed(precision);
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function describeEventTarget(event, state) {
  if (!event?.target) return '—';
  if (event.target.type === 'assetInstance') {
    const definition = getAssetDefinition(event.target.assetId);
    const assetState = state?.assets?.[event.target.assetId];
    const instance = assetState?.instances?.find(entry => entry?.id === event.target.instanceId) || null;
    const assetName = definition?.name || event.target.assetId;
    const nickname = instance?.nickname || instance?.label || null;
    const suffix = nickname ? ` (${nickname})` : instance ? ` (#${instance.id.slice(0, 6)})` : '';
    return `${assetName}${suffix}`;
  }
  if (event.target.type === 'niche') {
    const definition = getNicheDefinition(event.target.nicheId);
    return definition?.name || event.target.nicheId || 'Niche';
  }
  return '—';
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function renderOverview(container, state) {
  const events = Array.isArray(state?.events?.active) ? state.events.active.length : 0;
  const summary = {
    day: `Day ${Math.max(1, Number(state?.day) || 1)}`,
    money: `$${formatMoney(Number(state?.money) || 0)}`,
    time: formatHours(Math.max(0, Number(state?.timeLeft) || 0)),
    assets: countActiveAssets(state),
    events,
    updated: new Date().toLocaleString()
  };

  setText(container, '[data-dev-field="day"]', summary.day);
  setText(container, '[data-dev-field="money"]', summary.money);
  setText(container, '[data-dev-field="time"]', summary.time);
  setText(container, '[data-dev-field="assets"]', String(summary.assets));
  setText(container, '[data-dev-field="events"]', String(summary.events));
  setText(container, '[data-dev-field="updated"]', summary.updated);
}

function renderEvents(container, state) {
  const tableBody = container.querySelector('#developer-events-body');
  const emptyNote = container.querySelector('#developer-events-empty');
  if (!tableBody) return;

  const events = Array.isArray(state?.events?.active) ? state.events.active : [];
  tableBody.innerHTML = '';

  if (!events.length) {
    if (emptyNote) emptyNote.hidden = false;
    return;
  }

  if (emptyNote) emptyNote.hidden = true;

  events
    .slice()
    .sort((a, b) => Math.abs(b?.currentPercent || 0) - Math.abs(a?.currentPercent || 0))
    .forEach(event => {
      if (!event) return;
      const row = container.ownerDocument.createElement('tr');
      const impact = formatPercent(event.currentPercent || 0);
      const target = describeEventTarget(event, state);
      const remaining = `${Math.max(0, Number(event.remainingDays) || 0)} / ${Math.max(
        0,
        Number(event.totalDays) || 0
      )}`;
      const cells = [
        event.label || event.templateId || 'Event',
        impact,
        target,
        remaining,
        event.tone || 'neutral'
      ];
      cells.forEach(value => {
        const cell = container.ownerDocument.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
}

function buildEducationBuffs(state) {
  return Object.values(KNOWLEDGE_TRACKS)
    .map(track => {
      const progress = getKnowledgeProgress(track.id, state) || {};
      const status = progress.completed ? 'Completed' : progress.enrolled ? 'In progress' : 'Not enrolled';
      const details = describeTrackEducationBonuses(track.id).map(descriptor => {
        try {
          return descriptor();
        } catch (error) {
          return null;
        }
      });
      return {
        id: track.id,
        name: track.name,
        progress,
        status,
        details: details.filter(Boolean)
      };
    })
    .filter(entry => entry.details.length > 0 || entry.progress?.enrolled || entry.progress?.completed);
}

function renderEducationBuffs(container, state) {
  const list = container.querySelector('#developer-education-list');
  const empty = container.querySelector('#developer-education-empty');
  if (!list) return;

  const entries = buildEducationBuffs(state);
  list.innerHTML = '';

  if (!entries.length) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  entries.forEach(entry => {
    const item = container.ownerDocument.createElement('li');
    item.className = 'developer-buff-card';

    const title = container.ownerDocument.createElement('p');
    title.className = 'developer-buff-card__title';
    title.textContent = entry.name;

    const meta = container.ownerDocument.createElement('p');
    meta.className = 'developer-buff-card__meta';
    meta.textContent = `${entry.status} • ${entry.progress.daysCompleted || 0}/${
      entry.progress.totalDays ?? entry.progress.daysTotal ?? 0
    } days`;

    const notes = container.ownerDocument.createElement('p');
    notes.className = 'developer-buff-card__notes';
    notes.textContent = entry.details.join(' ');

    item.append(title, meta, notes);
    list.appendChild(item);
  });
}

function renderUpgradeBuffs(container, state) {
  const list = container.querySelector('#developer-upgrade-list');
  const empty = container.querySelector('#developer-upgrades-empty');
  if (!list) return;

  const owned = getUpgrades()
    .filter(definition => getUpgradeState(definition.id, state)?.purchased)
    .map(definition => ({
      id: definition.id,
      name: definition.name,
      boosts: definition.boosts || definition.description || '',
      tag: definition.tag?.label || null
    }))
    .filter(entry => Boolean(entry.boosts));

  list.innerHTML = '';

  if (!owned.length) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  owned.forEach(entry => {
    const item = container.ownerDocument.createElement('li');
    item.className = 'developer-buff-card';

    const title = container.ownerDocument.createElement('p');
    title.className = 'developer-buff-card__title';
    title.textContent = entry.name;

    const meta = container.ownerDocument.createElement('p');
    meta.className = 'developer-buff-card__meta';
    meta.textContent = entry.tag ? entry.tag : 'Upgrade boost';

    const notes = container.ownerDocument.createElement('p');
    notes.className = 'developer-buff-card__notes';
    notes.textContent = entry.boosts;

    item.append(title, meta, notes);
    list.appendChild(item);
  });
}

function renderTimeBuffs(container, state) {
  const base = formatHours(Number(state?.baseTime) || 0);
  const bonus = formatHours(Number(state?.bonusTime) || 0);
  const daily = formatHours(Number(state?.dailyBonusTime) || 0);

  setText(container, '[data-dev-field="baseTime"]', base);
  setText(container, '[data-dev-field="bonusTime"]', bonus);
  setText(container, '[data-dev-field="dailyBonus"]', daily);
}

function renderStateDump(container, state) {
  const output = container.querySelector('#developer-state-json');
  if (!output) return;
  output.textContent = JSON.stringify(state, null, 2);
}

export function renderDeveloperView(rootDocument = document) {
  const doc = rootDocument || document;
  const container = doc.getElementById('developer-root');
  if (!container) return;

  const state = getState();
  if (!state) {
    setText(container, '#developer-state-json', 'State manager not initialized.');
    return;
  }

  renderOverview(container, state);
  renderEvents(container, state);
  renderEducationBuffs(container, state);
  renderUpgradeBuffs(container, state);
  renderTimeBuffs(container, state);
  renderStateDump(container, state);
}
