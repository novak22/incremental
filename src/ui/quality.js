import { formatHours, formatMoney } from '../core/helpers.js';
import { getAssetState, getState } from '../core/state.js';
import {
  canPerformQualityAction,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityNextRequirements,
  getQualityTracks,
  performQualityAction
} from '../game/assets/quality.js';

function createEmptyMessage(container, message) {
  container.innerHTML = '';
  const note = document.createElement('p');
  note.className = 'quality-empty';
  note.textContent = message;
  container.appendChild(note);
}

export function attachQualityPanel(card, definition) {
  const panel = document.createElement('div');
  panel.className = 'quality-panel';

  const header = document.createElement('div');
  header.className = 'quality-panel__header';
  const title = document.createElement('h4');
  title.textContent = 'Quality Actions';
  header.appendChild(title);
  panel.appendChild(header);

  if (definition.quality?.summary) {
    const summary = document.createElement('p');
    summary.className = 'quality-panel__summary';
    summary.textContent = definition.quality.summary;
    panel.appendChild(summary);
  }

  const list = document.createElement('div');
  list.className = 'quality-panel__instances';
  panel.appendChild(list);

  card.appendChild(panel);

  return { panel, list, instanceNodes: new Map() };
}

export function updateQualityPanel(definition, panelState) {
  if (!panelState?.list) return;
  const state = getState();
  const assetState = getAssetState(definition.id);
  const instances = assetState.instances;

  if (!instances.length) {
    createEmptyMessage(panelState.list, 'No active assets yet. Launch one to begin quality work.');
    return;
  }

  panelState.list.innerHTML = '';
  panelState.instanceNodes = new Map();
  const tracks = getQualityTracks(definition);
  const actions = getQualityActions(definition);

  instances.forEach((instance, index) => {
    const item = document.createElement('div');
    item.className = 'quality-instance';
    item.dataset.instanceId = instance.id;

    const header = document.createElement('div');
    header.className = 'quality-instance__header';
    const label = document.createElement('strong');
    const name = definition.singular || definition.name || 'Asset';
    label.textContent = `${name} #${index + 1}`;
    header.appendChild(label);

    const status = document.createElement('span');
    status.className = 'quality-instance__status';
    if (instance.status !== 'active') {
      status.textContent = 'In setup';
      status.classList.add('is-muted');
    } else {
      const level = instance.quality?.level || 0;
      const levelDef = getQualityLevel(definition, level);
      const title = levelDef?.name ? ` · ${levelDef.name}` : '';
      status.textContent = `Quality ${level}${title}`;
    }
    header.appendChild(status);
    item.appendChild(header);

    if (instance.status === 'active') {
      const progressWrap = document.createElement('div');
      progressWrap.className = 'quality-instance__progress';
      const nextRequirements = getQualityNextRequirements(definition, instance.quality?.level || 0) || {};
      Object.entries(tracks).forEach(([key, track]) => {
        const row = document.createElement('div');
        row.className = 'quality-progress-row';
        const current = Number(instance.quality?.progress?.[key]) || 0;
        const target = Number(nextRequirements[key]) || null;
        if (target && target > current) {
          row.textContent = `${track.label || key}: ${current} / ${target}`;
        } else {
          row.textContent = `${track.label || key}: ${current}`;
        }
        progressWrap.appendChild(row);
      });
      if (progressWrap.childElementCount) {
        item.appendChild(progressWrap);
      }

      const actionsRow = document.createElement('div');
      actionsRow.className = 'quality-instance__actions';
      actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quality-action';
        const details = [];
        if (action.time) {
          details.push(`⏳ ${formatHours(action.time)}`);
        }
        if (action.cost) {
          details.push(`💵 $${formatMoney(action.cost)}`);
        }
        const usage = getQualityActionUsage(definition, instance, action);
        if (usage.dailyLimit > 0) {
          details.push(`🔁 ${usage.remainingUses}/${usage.dailyLimit} today`);
        }
        const suffix = details.length ? ` (${details.join(' · ')})` : '';
        button.textContent = `${action.label}${suffix}`;
        const availability = getQualityActionAvailability(definition, instance, action, state);
        const canRun = availability.unlocked && canPerformQualityAction(definition, instance, action, state);
        button.disabled = !canRun;
        if (!availability.unlocked) {
          button.title = availability.reason || 'Unlock supporting upgrades to use this action.';
          button.classList.add('is-locked');
        } else if (usage.exhausted) {
          button.title = 'Daily limit reached. Tomorrow brings another chance to push quality forward!';
          button.classList.remove('is-locked');
        } else {
          button.title = '';
          button.classList.remove('is-locked');
        }
        button.addEventListener('click', () => {
          if (button.disabled) return;
          performQualityAction(definition.id, instance.id, action.id);
        });
        actionsRow.appendChild(button);
      });
      if (!actions.length) {
        const note = document.createElement('span');
        note.className = 'quality-action__none';
        note.textContent = 'No quality actions configured.';
        actionsRow.appendChild(note);
      }
      item.appendChild(actionsRow);
    } else {
      const note = document.createElement('p');
      note.className = 'quality-instance__note';
      note.textContent = 'Quality work unlocks once setup wraps.';
      item.appendChild(note);
    }

    panelState.list.appendChild(item);
    panelState.instanceNodes.set(instance.id, item);
  });
}

export function focusQualityInstance(panelState, instanceId) {
  if (!panelState?.instanceNodes) return;
  for (const node of panelState.instanceNodes.values()) {
    node.classList.remove('is-highlighted');
  }
  const target = panelState.instanceNodes.get(instanceId);
  if (!target) return;
  target.classList.add('is-highlighted');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    target.classList.remove('is-highlighted');
  }, 1600);
}
