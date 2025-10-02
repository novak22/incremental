import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getState } from '../../../../core/state.js';
import {
  canPerformQualityAction,
  getInstanceQualityRange,
  getNextQualityLevel,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityNextRequirements,
  getQualityTracks,
  performQualityAction
} from '../../../../game/assets/quality.js';

export function summarizeQualityAvailability(availability) {
  return availability?.summary || 'Trigger quick actions to build quality momentum.';
}

export function describeQualityAvailability(definition, instance, state = getState()) {
  const availability = getQualityActionAvailability(definition, instance, state);
  return summarizeQualityAvailability(availability);
}

export function createInstanceQuickActions(definition, instance, state = getState()) {
  const container = document.createElement('div');
  container.className = 'asset-detail__quick-actions';

  if (instance.status !== 'active') {
    const note = document.createElement('span');
    note.className = 'asset-detail__action-note';
    note.textContent = 'Upgrades unlock after launch.';
    container.appendChild(note);
    return container;
  }

  const actions = getQualityActions(definition);
  if (!actions.length) {
    const note = document.createElement('span');
    note.className = 'asset-detail__action-note';
    note.textContent = 'No quality actions configured yet.';
    container.appendChild(note);
    return container;
  }

  const prioritized = [...actions].sort((a, b) => {
    const aAvailable = canPerformQualityAction(definition, instance, a, state) ? 1 : 0;
    const bAvailable = canPerformQualityAction(definition, instance, b, state) ? 1 : 0;
    return bAvailable - aAvailable;
  });

  const limit = Math.min(prioritized.length, 3);
  for (let index = 0; index < limit; index += 1) {
    const action = prioritized[index];
    if (!action) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-detail__action-button';
    button.textContent = action.label || 'Upgrade';
    const disabled = !canPerformQualityAction(definition, instance, action, state);
    button.disabled = disabled;
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
    let tooltip = details.join(' · ');
    if (usage.exhausted) {
      tooltip = `${tooltip ? `${tooltip} · ` : ''}All uses spent today. Come back tomorrow for a fresh charge.`;
    }
    if (tooltip) {
      button.title = tooltip;
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    container.appendChild(button);
  }

  if (prioritized.length > limit) {
    const more = document.createElement('span');
    more.className = 'asset-detail__action-note';
    more.textContent = `+${prioritized.length - limit} more upgrades available`;
    container.appendChild(more);
  }

  return container;
}

export function buildSpecialActionButtons(definition, instance, state = getState()) {
  if (instance.status !== 'active') return [];
  const actions = getQualityActions(definition);
  if (!actions.length) return [];
  const prioritized = [...actions].sort((a, b) => {
    const aAvailable = canPerformQualityAction(definition, instance, a, state) ? 1 : 0;
    const bAvailable = canPerformQualityAction(definition, instance, b, state) ? 1 : 0;
    return bAvailable - aAvailable;
  });
  const limit = Math.min(prioritized.length, 3);
  const buttons = [];
  for (let index = 0; index < limit; index += 1) {
    const action = prioritized[index];
    if (!action) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-detail__action-button';
    button.textContent = action.label || 'Upgrade';
    button.disabled = !canPerformQualityAction(definition, instance, action, state);
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
    if (details.length) {
      button.title = details.join(' · ');
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    buttons.push(button);
  }
  if (prioritized.length > limit) {
    const more = document.createElement('span');
    more.className = 'asset-detail__action-note';
    more.textContent = `+${prioritized.length - limit} more upgrades available`;
    buttons.push(more);
  }
  return buttons;
}

export function calculateInstanceProgress(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const nextRequirements = getQualityNextRequirements(definition, level);
  const levelInfo = getQualityLevel(definition, level);
  if (!nextRequirements) {
    return {
      level,
      levelInfo,
      nextLevel: null,
      percent: 1,
      summary: '',
      ready: true
    };
  }
  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  let totalGoal = 0;
  let totalCurrent = 0;
  const parts = [];
  Object.entries(nextRequirements).forEach(([key, targetValue]) => {
    const goal = Number(targetValue) || 0;
    if (goal <= 0) return;
    const current = Math.max(0, Number(progress?.[key]) || 0);
    totalGoal += goal;
    totalCurrent += Math.min(current, goal);
    const track = tracks[key];
    const label = track?.shortLabel || track?.label || key;
    parts.push(`${Math.min(current, goal)}/${goal} ${label}`);
  });
  const percent = totalGoal > 0 ? Math.max(0, Math.min(1, totalCurrent / totalGoal)) : 1;
  return {
    level,
    levelInfo,
    nextLevel: getNextQualityLevel(definition, level),
    percent,
    summary: parts.join(' • '),
    ready: percent >= 1
  };
}

export function buildQualityInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--quality';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Quality progress';
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  const progress = calculateInstanceProgress(definition, instance);
  if (progress.ready) {
    summary.textContent = 'Ready for a quality milestone — queue it up below!';
  } else if (progress.percent > 0) {
    summary.textContent = progress.summary || 'Chipping away at the next milestone.';
  } else {
    summary.textContent = 'No quality progress yet — try the quick actions below.';
  }
  container.appendChild(summary);

  const range = getInstanceQualityRange(definition, instance);
  const levelDetail = document.createElement('p');
  levelDetail.className = 'asset-detail__insight-note';
  const current = Number(instance.quality?.level) || 0;
  const currentInfo = getQualityLevel(definition, current);
  const label = currentInfo?.name ? ` (${currentInfo.name})` : '';
  levelDetail.textContent = `Quality ${current}${label} · Range ${range.min}–${range.max}`;
  container.appendChild(levelDetail);

  if (progress.nextLevel) {
    const requirement = document.createElement('p');
    requirement.className = 'asset-detail__insight-note';
    requirement.textContent = `Next boost: ${progress.nextLevel.name}`;
    container.appendChild(requirement);
  }

  return container;
}

export function buildNextQualityInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--milestone';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Next quality goal';
  container.appendChild(title);

  const progress = calculateInstanceProgress(definition, instance);
  if (!progress.nextLevel) {
    const summary = document.createElement('p');
    summary.className = 'asset-detail__insight-body';
    summary.textContent = 'Maxed out! Further boosts will arrive in a future update.';
    container.appendChild(summary);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = progress.ready
    ? 'Ready to cash in! Trigger the milestone below.'
    : progress.summary || 'Keep investing to unlock the next boost.';
  container.appendChild(summary);

  const progressBar = document.createElement('progress');
  progressBar.max = 1;
  progressBar.value = progress.percent;
  progressBar.className = 'asset-detail__progress';
  container.appendChild(progressBar);

  const milestone = document.createElement('p');
  milestone.className = 'asset-detail__insight-note';
  milestone.textContent = `${progress.nextLevel.name} · ${Math.round(progress.percent * 100)}% ready`;
  container.appendChild(milestone);

  return container;
}

export function buildQualityBlock(definition, instance, state = getState()) {
  const block = document.createElement('section');
  block.className = 'asset-detail__section asset-detail__section--quality';

  const header = document.createElement('header');
  header.className = 'asset-detail__section-header';
  const title = document.createElement('h3');
  title.textContent = 'Quality management';
  header.appendChild(title);
  block.appendChild(header);

  const note = document.createElement('p');
  note.className = 'asset-detail__section-note';
  note.textContent = describeQualityAvailability(definition, instance, state);
  block.appendChild(note);

  const actions = buildSpecialActionButtons(definition, instance, state);
  const actionRow = document.createElement('div');
  actionRow.className = 'asset-detail__action-row';
  if (actions.length) {
    actions.forEach(button => actionRow.appendChild(button));
  } else {
    const hint = document.createElement('span');
    hint.className = 'asset-detail__action-note';
    hint.textContent = 'No quick actions configured yet. Check back soon!';
    actionRow.appendChild(hint);
  }
  block.appendChild(actionRow);

  return block;
}
