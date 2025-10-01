import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeRequirement, getDefinitionRequirements } from '../../../game/requirements.js';
import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance
} from '../../../game/assets/helpers.js';
import {
  canPerformQualityAction,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityNextRequirements,
  getQualityTracks,
  getNextQualityLevel,
  getInstanceQualityRange,
  performQualityAction
} from '../../../game/assets/quality.js';
import { getPendingEquipmentUpgrades } from '../../assetUpgrades.js';
import { createAssetUpgradeShortcuts } from '../../assetUpgradeShortcuts.js';
import { describeInstance, describeInstanceNetHourly } from '../../assetInstances.js';
import { formatInstanceUpkeep } from '../../cards/model.js';


export function createAssetDetailHighlights(definition) {
  const entries = Array.isArray(definition.detailEntries)
    ? definition.detailEntries
    : Array.isArray(definition.details)
      ? definition.details.map((render, index) => ({ key: `detail-${index}`, render }))
      : [];

  const renderedDetails = entries
    .map((entry, index) => {
      const render = typeof entry.render === 'function' ? entry.render : entry;
      if (typeof render !== 'function') return null;
      try {
        const value = render();
        if (!value) return null;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return null;
          return { key: entry.key || `detail-${index}`, value: trimmed };
        }
        if (value instanceof Node) {
          return { key: entry.key || `detail-${index}`, value };
        }
        return null;
      } catch (error) {
        console.error('Failed to render asset detail', error);
        return null;
      }
    })
    .filter(Boolean);

  const detailByKey = new Map();
  renderedDetails.forEach(detail => {
    if (!detailByKey.has(detail.key)) {
      detailByKey.set(detail.key, []);
    }
    detailByKey.get(detail.key).push(detail.value);
  });

  const requirements = getDefinitionRequirements(definition);
  const section = document.createElement('section');
  section.className = 'asset-detail__section asset-detail__section--blueprint';
  const heading = document.createElement('h3');
  heading.textContent = 'Launch blueprint';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'asset-detail__summary-grid';
  section.appendChild(grid);

  // Requirements column
  const requirementsCard = document.createElement('article');
  requirementsCard.className = 'asset-detail__summary-card asset-detail__summary-card--requirements';
  const requirementsTitle = document.createElement('h4');
  requirementsTitle.textContent = 'Requirements';
  requirementsCard.appendChild(requirementsTitle);
  const requirementsList = document.createElement('ul');
  requirementsList.className = 'asset-detail__summary-list';
  if (requirements?.hasAny) {
    requirements.all.forEach(req => {
      const descriptor = describeRequirement(req);
      const item = document.createElement('li');
      item.className = 'asset-detail__summary-item';
      item.innerHTML = descriptor?.detail || '❔ <strong>Requirement</strong>';
      requirementsList.appendChild(item);
    });
  } else {
    const fallbackItem = document.createElement('li');
    fallbackItem.className = 'asset-detail__summary-item';
    const fallbackDetail = detailByKey.get('requirements')?.[0] || '🔓 Requirements: <strong>None</strong>';
    if (typeof fallbackDetail === 'string') {
      fallbackItem.innerHTML = fallbackDetail;
    } else if (fallbackDetail instanceof Node) {
      fallbackItem.appendChild(fallbackDetail);
    }
    requirementsList.appendChild(fallbackItem);
  }
  requirementsCard.appendChild(requirementsList);
  grid.appendChild(requirementsCard);

  // Roadmap / stats column
  const roadmapCard = document.createElement('article');
  roadmapCard.className = 'asset-detail__summary-card asset-detail__summary-card--roadmap';
  const roadmapTitle = document.createElement('h4');
  roadmapTitle.textContent = 'Roadmap & stats';
  roadmapCard.appendChild(roadmapTitle);

  const roadmapList = document.createElement('ul');
  roadmapList.className = 'asset-detail__summary-list';
  const roadmapKeys = ['owned', 'setup', 'setupCost', 'maintenance', 'income', 'latestYield'];
  roadmapKeys.forEach(key => {
    const values = detailByKey.get(key) || [];
    values.forEach(value => {
      const item = document.createElement('li');
      item.className = 'asset-detail__summary-item';
      if (typeof value === 'string') {
        item.innerHTML = value;
      } else if (value instanceof Node) {
        item.appendChild(value);
      }
      roadmapList.appendChild(item);
    });
  });

  const consumedKeys = new Set(['requirements', 'qualitySummary', 'qualityProgress', ...roadmapKeys]);
  const extraDetails = renderedDetails.filter(detail => !consumedKeys.has(detail.key));
  extraDetails.forEach(detail => {
    const item = document.createElement('li');
    item.className = 'asset-detail__summary-item';
    if (typeof detail.value === 'string') {
      item.innerHTML = detail.value;
    } else if (detail.value instanceof Node) {
      item.appendChild(detail.value);
    }
    roadmapList.appendChild(item);
  });

  if (!roadmapList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'asset-detail__summary-item';
    empty.textContent = 'No roadmap details available yet.';
    roadmapList.appendChild(empty);
  }

  roadmapCard.appendChild(roadmapList);
  grid.appendChild(roadmapCard);

  // Quality column
  const qualityCard = document.createElement('article');
  qualityCard.className = 'asset-detail__summary-card asset-detail__summary-card--quality';
  const qualityTitle = document.createElement('h4');
  qualityTitle.textContent = 'Quality journey';
  qualityCard.appendChild(qualityTitle);

  const qualitySummary = detailByKey.get('qualitySummary')?.[0];
  const summaryCopy = document.createElement('p');
  summaryCopy.className = 'asset-detail__summary-copy';
  if (typeof qualitySummary === 'string') {
    summaryCopy.innerHTML = qualitySummary;
  } else if (qualitySummary instanceof Node) {
    summaryCopy.appendChild(qualitySummary);
  } else {
    summaryCopy.textContent = '✨ Quality boosts unlock as you invest in specialty tracks.';
  }
  qualityCard.appendChild(summaryCopy);

  const qualityList = document.createElement('ul');
  qualityList.className = 'asset-detail__summary-list asset-detail__summary-list--quality';
  const tracks = getQualityTracks(definition);
  const levels = getQualityLevelSummary(definition);
  levels.forEach(level => {
    const item = document.createElement('li');
    item.className = 'asset-detail__summary-item';
    const title = document.createElement('div');
    title.className = 'asset-detail__summary-line';
    title.innerHTML = `<strong>Quality ${level.level}:</strong> ${level.name}`;
    item.appendChild(title);
    const requirementEntries = Object.entries(level.requirements || {});
    if (requirementEntries.length) {
      const detail = document.createElement('div');
      detail.className = 'asset-detail__summary-subtext';
      const parts = requirementEntries.map(([key, value]) => {
        const label = tracks[key]?.shortLabel || tracks[key]?.label || key;
        return `${value} ${label}`;
      });
      detail.textContent = parts.join(' • ');
      item.appendChild(detail);
    } else {
      const detail = document.createElement('div');
      detail.className = 'asset-detail__summary-subtext';
      detail.textContent = 'Entry tier — no prep required.';
      item.appendChild(detail);
    }
    qualityList.appendChild(item);
  });
  qualityCard.appendChild(qualityList);
  grid.appendChild(qualityCard);

  return section;
}

function createInstanceQuickActions(definition, instance, state) {
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

function createInstanceNicheSelector(definition, instance) {
  if (!definition || !instance) return null;
  const summaries = getAssignableNicheSummaries(definition);
  if (!summaries.length) return null;

  const container = document.createElement('div');
  container.className = 'asset-detail__niche-selector';

  const label = document.createElement('label');
  label.className = 'asset-detail__niche-label';
  const selectId = `asset-niche-${instance.id}`;
  label.setAttribute('for', selectId);
  label.textContent = 'Target niche';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'asset-detail__niche-dropdown';
  select.id = selectId;
  select.name = selectId;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Unassigned';
  select.appendChild(placeholder);

  summaries.forEach(entry => {
    if (!entry?.definition) return;
    const option = document.createElement('option');
    option.value = entry.definition.id;
    const labelParts = [entry.definition.name];
    if (entry.popularity?.label) {
      labelParts.push(entry.popularity.label);
    }
    option.textContent = labelParts.join(' • ');
    select.appendChild(option);
  });

  const currentValue = typeof instance.nicheId === 'string' ? instance.nicheId : '';
  select.value = currentValue && Array.from(select.options).some(opt => opt.value === currentValue)
    ? currentValue
    : '';

  const hint = document.createElement('p');
  hint.className = 'asset-detail__niche-note';

  function updateHint(selectedId) {
    const match = summaries.find(entry => entry?.definition?.id === selectedId) || null;
    if (!match || !match.popularity) {
      hint.textContent = 'Choose a niche to tap into daily popularity rerolls.';
      return;
    }
    const multiplier = Number(match.popularity.multiplier);
    let percentLabel = '±0%';
    if (Number.isFinite(multiplier)) {
      const percent = Math.round((multiplier - 1) * 100);
      const sign = percent > 0 ? '+' : '';
      percentLabel = `${sign}${percent}%`;
    }
    const summary = match.popularity.summary || 'Demand shifts update daily.';
    hint.textContent = `${summary} • Payout impact ${percentLabel}`;
  }

  updateHint(select.value || '');

  select.addEventListener('change', event => {
    const nextValue = event.target.value;
    assignInstanceToNiche(definition.id, instance.id, nextValue || null);
    updateHint(nextValue || '');
  });

  container.appendChild(select);
  container.appendChild(hint);

  return container;
}

export function createInstanceCard(definition, instance, index, state) {
  const item = document.createElement('li');
  item.className = 'asset-detail__instance';
  item.dataset.instanceId = instance.id;

  const header = document.createElement('div');
  header.className = 'asset-detail__instance-header';
  const name = document.createElement('strong');
  name.textContent = instanceLabel(definition, index);
  header.appendChild(name);

  const status = document.createElement('span');
  status.className = 'asset-detail__instance-status';
  const statusText = describeInstance(definition, instance);
  if (instance.status === 'active') {
    const level = Number(instance.quality?.level) || 0;
    const levelInfo = getQualityLevel(definition, level);
    const label = levelInfo?.name ? ` • ${levelInfo.name}` : '';
    status.textContent = `${statusText}${label}`;
  } else {
    status.textContent = statusText;
  }
  header.appendChild(status);
  item.appendChild(header);

  const overview = buildInstanceOverview(definition, instance);
  if (overview) {
    item.appendChild(overview);
  }

  const stats = buildInstanceStats(definition, instance);
  if (stats) {
    item.appendChild(stats);
  }

  const actions = document.createElement('div');
  actions.className = 'asset-detail__actions';

  const actionColumns = document.createElement('div');
  actionColumns.className = 'asset-detail__action-columns';
  const quickActions = createInstanceQuickActions(definition, instance, state);
  if (quickActions) {
    actionColumns.appendChild(quickActions);
  }
  const nicheSelector = createInstanceNicheSelector(definition, instance);
  if (nicheSelector) {
    actionColumns.appendChild(nicheSelector);
  }
  const equipmentShortcuts = instance.status === 'active'
    ? createEquipmentShortcuts(definition, state)
    : null;
  if (equipmentShortcuts) {
    actionColumns.appendChild(equipmentShortcuts);
  }
  actions.appendChild(actionColumns);

  const sellButton = document.createElement('button');
  sellButton.type = 'button';
  sellButton.className = 'asset-detail__sell secondary';
  const price = calculateAssetSalePrice(instance);
  sellButton.textContent = price > 0 ? `Sell for $${formatMoney(price)}` : 'No buyer yet';
  sellButton.disabled = price <= 0;
  sellButton.addEventListener('click', event => {
    event.preventDefault();
    if (sellButton.disabled) return;
    sellAssetInstance(definition, instance.id);
  });
  actions.appendChild(sellButton);

  item.appendChild(actions);
  return item;
}

function buildInstanceOverview(definition, instance) {
  const sections = [];
  const niche = buildNicheInsight(definition, instance);
  if (niche) {
    sections.push(niche);
  }
  const quality = buildQualityInsight(definition, instance);
  if (quality) {
    sections.push(quality);
  }
  if (instance.status === 'active') {
    const milestone = buildNextQualityInsight(definition, instance);
    if (milestone) {
      sections.push(milestone);
    }
    const payout = buildPayoutInsight(definition, instance);
    if (payout) {
      sections.push(payout);
    }
  }
  if (!sections.length) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'asset-detail__instance-overview';
  sections.forEach(section => wrapper.appendChild(section));
  return wrapper;
}

function buildNicheInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--niche';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Audience niche';
  container.appendChild(title);

  const info = getInstanceNicheInfo(instance);
  if (!info) {
    const summary = document.createElement('p');
    summary.className = 'asset-detail__insight-body';
    summary.textContent = 'Unassigned — pick a niche below to sync with daily demand.';
    container.appendChild(summary);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = `${info.definition.name} • ${info.popularity.label} mood`;
  container.appendChild(summary);

  const note = document.createElement('p');
  note.className = 'asset-detail__insight-note';
  const multiplier = Number(info.popularity.multiplier);
  let percentLabel = '±0%';
  if (Number.isFinite(multiplier)) {
    const percent = Math.round((multiplier - 1) * 100);
    const sign = percent > 0 ? '+' : '';
    percentLabel = `${sign}${percent}%`;
  }
  note.textContent = `${info.popularity.summary || 'Demand shifts update daily.'} (payout impact ${percentLabel}).`;
  container.appendChild(note);

  return container;
}

function buildQualityInsight(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const levelInfo = getQualityLevel(definition, level);
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Current quality';
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  const tierName = levelInfo?.name ? ` — ${levelInfo.name}` : '';
  summary.textContent = `Quality ${level}${tierName}`;
  container.appendChild(summary);

  if (levelInfo?.description) {
    const detail = document.createElement('p');
    detail.className = 'asset-detail__insight-note';
    detail.textContent = levelInfo.description;
    container.appendChild(detail);
  }

  return container;
}

function buildNextQualityInsight(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const nextRequirements = getQualityNextRequirements(definition, level);
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--milestone';

  const hero = document.createElement('div');
  hero.className = 'asset-detail__milestone-hero';

  const label = document.createElement('span');
  label.className = 'asset-detail__milestone-label';
  label.textContent = 'Next milestone';
  hero.appendChild(label);

  if (!nextRequirements) {
    const complete = document.createElement('p');
    complete.className = 'asset-detail__milestone-message';
    complete.textContent = 'Top tier unlocked — keep collecting those dreamy payouts!';
    hero.appendChild(complete);
    container.appendChild(hero);
    return container;
  }

  const nextLevel = getNextQualityLevel(definition, level);
  if (nextLevel) {
    const heading = document.createElement('p');
    heading.className = 'asset-detail__milestone-target';
    const tierName = nextLevel.name ? ` — ${nextLevel.name}` : '';
    heading.textContent = `Quality ${nextLevel.level}${tierName}`;
    hero.appendChild(heading);
    if (nextLevel.description) {
      const description = document.createElement('p');
      description.className = 'asset-detail__milestone-message';
      description.textContent = nextLevel.description;
      hero.appendChild(description);
    }
  }

  container.appendChild(hero);

  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  const entries = Object.entries(nextRequirements)
    .map(([key, target]) => {
      const track = tracks[key];
      const labelText = track?.shortLabel || track?.label || key;
      const goal = Number(target) || 0;
      if (goal <= 0) return null;
      const current = Number(progress?.[key]) || 0;
      const remaining = Math.max(0, goal - current);
      if (remaining <= 0) return null;
      const percent = goal > 0 ? Math.max(0, Math.min(1, current / goal)) : 0;
      return { label: labelText, current, goal, remaining, percent };
    })
    .filter(Boolean);

  if (!entries.length) {
    const ready = document.createElement('p');
    ready.className = 'asset-detail__milestone-message';
    ready.textContent = 'All requirements met! Run a quality action to celebrate the rank up.';
    container.appendChild(ready);
    return container;
  }

  const list = document.createElement('ul');
  list.className = 'asset-detail__requirement-list asset-detail__requirement-list--milestone';
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'asset-detail__requirement-entry asset-detail__requirement-entry--milestone';

    const labelEl = document.createElement('span');
    labelEl.className = 'asset-detail__requirement-label';
    labelEl.textContent = entry.label;
    item.appendChild(labelEl);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'asset-detail__requirement-progress';

    const value = document.createElement('span');
    value.className = 'asset-detail__requirement-value asset-detail__requirement-value--milestone';
    value.textContent = `${entry.current} / ${entry.goal}`;
    progressWrap.appendChild(value);

    const meter = document.createElement('span');
    meter.className = 'asset-detail__requirement-meter';
    const fill = document.createElement('span');
    fill.className = 'asset-detail__requirement-meter-fill';
    fill.style.width = `${Math.round(entry.percent * 100)}%`;
    meter.appendChild(fill);
    progressWrap.appendChild(meter);

    const remaining = document.createElement('span');
    remaining.className = 'asset-detail__requirement-remaining';
    remaining.textContent = `${entry.remaining} to go`;
    progressWrap.appendChild(remaining);

    item.appendChild(progressWrap);
    list.appendChild(item);
  });
  container.appendChild(list);
  return container;
}

function buildPayoutInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Latest payout';
  container.appendChild(title);

  if (instance.status !== 'active') {
    const note = document.createElement('p');
    note.className = 'asset-detail__insight-body';
    note.textContent = 'Launch the build to start logging daily payouts.';
    container.appendChild(note);
    return container;
  }

  const breakdown = instance.lastIncomeBreakdown;
  const total = Number(breakdown?.total) || Number(instance.lastIncome) || 0;
  const entries = Array.isArray(breakdown?.entries) ? breakdown.entries : [];

  if (!entries.length || total <= 0) {
    const range = getInstanceQualityRange(definition, instance);
    const message = document.createElement('p');
    message.className = 'asset-detail__insight-body';
    const min = Math.max(0, Number(range?.min) || 0);
    const max = Math.max(min, Number(range?.max) || 0);
    message.textContent = `No payout logged yesterday. Fund upkeep to roll $${formatMoney(min)}–$${formatMoney(max)} per day.`;
    container.appendChild(message);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = `Earned $${formatMoney(Math.max(0, Math.round(total)))} yesterday.`;
  container.appendChild(summary);

  const list = document.createElement('ul');
  list.className = 'asset-detail__payout-breakdown';

  entries.forEach(entry => {
    if (!entry?.label) return;
    const amount = Math.round(Number(entry.amount) || 0);
    if (entry.type !== 'base' && amount === 0) {
      return;
    }
    const item = document.createElement('li');
    item.className = 'asset-detail__payout-entry';
    if (entry.type === 'base') {
      item.classList.add('is-base');
    } else if (amount >= 0) {
      item.classList.add('is-positive');
    } else {
      item.classList.add('is-negative');
    }
    const label = document.createElement('span');
    label.className = 'asset-detail__payout-label';
    label.textContent = entry.label;
    if (entry.percent !== null && entry.percent !== undefined) {
      const formattedPercent = formatPercent(entry.percent);
      if (formattedPercent) {
        const percent = document.createElement('span');
        percent.className = 'asset-detail__payout-percent';
        percent.textContent = ` (${formattedPercent})`;
        label.appendChild(percent);
      }
    }
    const value = document.createElement('span');
    value.className = 'asset-detail__payout-value';
    if (entry.type === 'base') {
      value.textContent = `$${formatMoney(Math.abs(amount))}`;
    } else {
      const sign = amount >= 0 ? '+' : '\u2212';
      value.textContent = `${sign}$${formatMoney(Math.abs(amount))}`;
    }
    item.append(label, value);
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

export function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  const percent = numeric * 100;
  if (Math.abs(percent) < 0.05) {
    return '0%';
  }
  const rounded = Math.round(percent);
  const difference = Math.abs(percent - rounded);
  const base = difference < 0.1 ? rounded : percent.toFixed(1);
  const prefix = percent > 0 && !String(base).startsWith('+') ? '+' : '';
  return `${prefix}${base}%`;
}

function buildInstanceStats(definition, instance) {
  const stats = document.createElement('div');
  stats.className = 'asset-detail__instance-stats';

  const lastPayout = instance.status === 'active' ? formatInstanceLastPayout(instance) : '';
  if (lastPayout) {
    stats.appendChild(createInstanceStat('Last payout', lastPayout));
  }

  if (instance.status === 'active') {
    const roiText = describeInstanceNetHourly(definition, instance);
    if (roiText) {
      let variant = '';
      if (roiText.startsWith('-')) {
        variant = 'negative';
      } else if (roiText.startsWith('$')) {
        variant = 'positive';
      }
      const stat = createInstanceStat('Net / hour', roiText, variant ? { variant } : {});
      if (stat) {
        stats.appendChild(stat);
      }
    }
  }

  const upkeep = formatInstanceUpkeep(definition);
  if (upkeep) {
    const label = instance.status === 'active' ? 'Upkeep' : 'Planned upkeep';
    stats.appendChild(createInstanceStat(label, upkeep));
  }

  if (instance.status !== 'active') {
    const launchEta = formatLaunchEta(instance);
    if (launchEta) {
      stats.appendChild(createInstanceStat('Launch ETA', launchEta));
    }
  }

  if (!stats.childElementCount) {
    return null;
  }
  return stats;
}

function createInstanceStat(label, value, { variant } = {}) {
  if (!value) return null;
  const stat = document.createElement('div');
  stat.className = 'asset-detail__instance-stat';
  if (variant) {
    stat.classList.add(`is-${variant}`);
  }
  const statLabel = document.createElement('span');
  statLabel.className = 'asset-detail__instance-stat-label';
  statLabel.textContent = label;
  const statValue = document.createElement('span');
  statValue.className = 'asset-detail__instance-stat-value';
  statValue.textContent = value;
  stat.append(statLabel, statValue);
  return stat;
}

function formatInstanceLastPayout(instance) {
  if (!instance || instance.status !== 'active') {
    return '';
  }
  const lastIncome = Math.max(0, Number(instance.lastIncome) || 0);
  if (lastIncome > 0) {
    return `$${formatMoney(lastIncome)} yesterday`;
  }
  return 'None yesterday';
}

function formatLaunchEta(instance) {
  if (!instance) return '';
  const remaining = Number(instance.daysRemaining);
  if (!Number.isFinite(remaining)) {
    return 'Ready soon';
  }
  if (remaining <= 0) {
    return 'Ready tomorrow';
  }
  if (remaining === 1) {
    return '1 day';
  }
  return `${remaining} days`;
}

function getUpgradeTimeEstimate(upgrade) {
  if (!upgrade) return 0;
  const candidates = [
    upgrade.installTime,
    upgrade.timeCost,
    upgrade.duration,
    upgrade.metrics?.time?.hours,
    upgrade.action?.timeCost
  ];
  for (const candidate of candidates) {
    const hours = Number(candidate);
    if (Number.isFinite(hours) && hours > 0) {
      return hours;
    }
  }
  return 2;
}

function createEquipmentShortcuts(definition, state) {
  const pending = getPendingEquipmentUpgrades(definition, state);
  return createAssetUpgradeShortcuts(pending, {
    containerClass: 'asset-detail__upgrade-shortcuts',
    titleClass: 'asset-detail__upgrade-title',
    buttonRowClass: 'asset-detail__upgrade-buttons',
    buttonClass: 'asset-detail__upgrade-button',
    moreClass: 'asset-detail__upgrade-more',
    singularTitle: 'Equipment boost',
    pluralTitle: 'Equipment boosts',
    includeTimeEstimate: true,
    getTimeEstimate: getUpgradeTimeEstimate,
    formatTimeEstimate: formatHours,
    moreLabel: count => `+${count} more`
  });
}

function renderHustleCard(definition, model, container) {
  if (!definition || !model) return;

  const card = document.createElement('article');
  card.className = 'hustle-card';
  card.dataset.hustle = model.id;
  card.dataset.search = model.filters.search || '';
  card.dataset.time = String(model.metrics.time.value);
  card.dataset.payout = String(model.metrics.payout.value);
  card.dataset.roi = String(model.metrics.roi);
  card.dataset.available = model.available ? 'true' : 'false';
  if (model.filters.limitRemaining !== null && model.filters.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  const header = document.createElement('div');
  header.className = 'hustle-card__header';
  const title = document.createElement('h3');
  title.className = 'hustle-card__title';
  title.textContent = model.name;
  header.appendChild(title);
  const badges = document.createElement('div');
  badges.className = 'badges';
  model.badges.forEach(text => {
    if (!text) return;
    badges.appendChild(createBadge(text));
  });
  header.appendChild(badges);
  card.appendChild(header);

  if (model.description) {
    const summary = document.createElement('p');
    summary.textContent = model.description;
    card.appendChild(summary);
  }

  const meta = document.createElement('div');
  meta.className = 'hustle-card__meta';
  meta.textContent = model.requirements.summary;
  card.appendChild(meta);

  const limitDetail = document.createElement('p');
  limitDetail.className = 'hustle-card__limit';
  if (model.limit?.summary) {
    limitDetail.hidden = false;
    limitDetail.textContent = model.limit.summary;
  } else {
    limitDetail.hidden = true;
  }
  card.appendChild(limitDetail);

  const actions = document.createElement('div');
  actions.className = 'hustle-card__actions';
  let queueButton = null;
  if (definition.action?.onClick && model.action) {
    queueButton = document.createElement('button');
    queueButton.type = 'button';
    queueButton.className = model.action.className || 'primary';
    queueButton.textContent = model.action.label;
    queueButton.disabled = model.action.disabled;
    queueButton.addEventListener('click', () => {
      if (queueButton.disabled) return;
      definition.action.onClick();
    });
    actions.appendChild(queueButton);
  }

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'ghost';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', () => openHustleDetails(definition));
  actions.appendChild(detailsButton);

  card.appendChild(actions);
  container.appendChild(card);

  hustleUi.set(definition.id, { card, queueButton, limitDetail });
}

function updateHustleCard(definition, model) {
  const ui = hustleUi.get(definition.id);
  if (!ui || !model) return;

  const previousAvailability = ui.card.dataset.available;

  ui.card.dataset.time = String(model.metrics.time.value);
  ui.card.dataset.payout = String(model.metrics.payout.value);
  ui.card.dataset.roi = String(model.metrics.roi);
  ui.card.dataset.available = model.available ? 'true' : 'false';

  if (model.filters.limitRemaining !== null && model.filters.limitRemaining !== undefined) {
    ui.card.dataset.limitRemaining = String(model.filters.limitRemaining);
  } else {
    delete ui.card.dataset.limitRemaining;
  }

  if (ui.queueButton && model.action) {
    ui.queueButton.className = model.action.className || 'primary';
    ui.queueButton.disabled = model.action.disabled;
    ui.queueButton.textContent = model.action.label;
  }

  if (ui.limitDetail) {
    if (model.limit?.summary) {
      ui.limitDetail.hidden = false;
      ui.limitDetail.textContent = model.limit.summary;
    } else {
      ui.limitDetail.hidden = true;
      ui.limitDetail.textContent = '';
    }
  }

  const availabilityChanged = previousAvailability !== ui.card.dataset.available;
  if (availabilityChanged) {
    emitUIEvent('hustles:availability-updated');
  }
}

function openHustleDetails(definition) {
  const state = getState();
  const time = Number(definition.time || definition.action?.timeCost) || 0;
  const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
  const body = document.createElement('div');
  body.className = 'hustle-detail';

  const usage = getHustleDailyUsage(definition, state);

  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }

  const stats = [
    { label: 'Time', value: formatHours(time) },
    { label: 'Payout', value: payout > 0 ? `$${formatMoney(payout)}` : 'Varies' }
  ];
  if (usage) {
    stats.push({
      label: 'Daily limit',
      value: usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Maxed out today — resets tomorrow'
    });
  }

  body.appendChild(createDefinitionSummary('Stats', stats));

  const requirements = describeHustleRequirements(definition, state) || [];
  const reqRows = requirements.length
    ? requirements.map(req => ({
        label: req.type === 'limit' ? 'Daily limit' : req.label,
        value: req.type === 'limit'
          ? (req.met
              ? `${req.progress?.remaining ?? 0}/${req.progress?.limit ?? 0} runs left today`
              : 'Maxed out today — resets tomorrow')
          : req.met
            ? 'Ready'
            : `${req.progress?.have ?? 0}/${req.progress?.need ?? 1}`
      }))
    : [{ label: 'Requirements', value: 'None' }];
  body.appendChild(createDefinitionSummary('Requirements', reqRows));

  showSlideOver({ eyebrow: 'Hustle', title: definition.name, body });
}

function renderHustles(definitions, hustleModels = []) {
  const { hustleList } = getHustleControls() || {};
  const container = hustleList;
  if (!container) return;
  container.innerHTML = '';
  hustleUi.clear();
  const modelMap = indexModelsById(hustleModels);
  definitions.forEach(definition => {
    const model = modelMap.get(definition.id) || hustleModelCache.get(definition.id);
    renderHustleCard(definition, model, container);
  });
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

export function formatInstanceDailyAverage(instance, state = getState()) {
  if (!instance || instance.status !== 'active') {
    return 'Launch pending';
  }
  const totalIncome = Math.max(0, Number(instance.totalIncome) || 0);
  const createdOnDay = Math.max(1, Number(instance.createdOnDay) || 1);
  const currentDay = Math.max(1, Number(state?.day) || 1);
  const daysActive = Math.max(1, currentDay - createdOnDay + 1);
  if (totalIncome <= 0) {
    return 'No earnings yet';
  }
  return `$${formatMoney(totalIncome / daysActive)} avg`;
}

export function buildSpecialActionButtons(definition, instance, state) {
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
    button.className = 'ghost';
    button.textContent = action.label || 'Upgrade';
    const availability = getQualityActionAvailability(definition, instance, action, state);
    const disabled = !canPerformQualityAction(definition, instance, action, state);
    button.disabled = disabled;
    const details = [];
    const timeCost = Math.max(0, Number(action.time) || 0);
    const moneyCost = Math.max(0, Number(action.cost) || 0);
    if (timeCost > 0) {
      details.push(`⏳ ${formatHours(timeCost)}`);
    }
    if (moneyCost > 0) {
      details.push(`💵 $${formatMoney(moneyCost)}`);
    }
    const usage = getQualityActionUsage(definition, instance, action);
    if (usage.dailyLimit > 0) {
      details.push(`🔁 ${usage.remainingUses}/${usage.dailyLimit} today`);
    }
    const timeLeft = Math.max(0, Number(state?.timeLeft) || 0);
    const moneyAvailable = Math.max(0, Number(state?.money) || 0);
    const tooltipParts = [...details];
    if (!availability.unlocked && availability.reason) {
      tooltipParts.push(availability.reason);
    }
    if (usage.exhausted) {
      tooltipParts.push('All uses spent today. Come back tomorrow for a fresh charge.');
    }
    if (disabled && availability.unlocked) {
      if (timeCost > 0 && timeLeft < timeCost) {
        tooltipParts.push(`Need ${formatHours(timeCost)} free (have ${formatHours(timeLeft)})`);
      }
      if (moneyCost > 0 && moneyAvailable < moneyCost) {
        tooltipParts.push(
          `Need $${formatMoney(moneyCost)} (have $${formatMoney(Math.max(0, Math.floor(moneyAvailable)))})`
        );
      }
    }
    if (tooltipParts.length) {
      button.title = tooltipParts.join(' • ');
    }
    button.classList.add('asset-overview-card__upgrade-action');
    button.classList.add(disabled ? 'asset-overview-card__action--locked' : 'asset-overview-card__action--available');
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    buttons.push(button);
  }
  return buttons;
}
