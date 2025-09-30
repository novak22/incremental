import elements from './elements.js';
import setText from './dom.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getAssetState, getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import {
  canPerformQualityAction,
  getNextQualityLevel,
  getQualityActions,
  getQualityTracks,
  performQualityAction
} from '../game/assets/quality.js';
import { instanceLabel } from '../game/assets/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../game/requirements.js';
import { getTimeCap } from '../game/time.js';
import { getNicheRoster } from '../game/assets/niches.js';

function createDailyListItem(entry) {
  const li = document.createElement('li');
  li.className = 'daily-stats__item';
  const label = document.createElement('span');
  label.className = 'daily-stats__label';
  label.textContent = entry.label || 'Unknown';
  const value = document.createElement('span');
  value.className = 'daily-stats__value';
  value.textContent = entry.value || '';
  if (entry.definition?.name) {
    li.title = entry.definition.name;
  }
  if (entry.definition?.id) {
    li.dataset.metric = entry.definition.id;
  }
  li.append(label, value);
  return li;
}

function renderActionSection(container, entries, { emptyMessage, buttonClass, defaultLabel } = {}) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('action-list');

  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!list.length) {
    if (!emptyMessage) return;
    const empty = document.createElement('li');
    empty.className = 'action-list__empty';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'action-list__item';

    const content = document.createElement('div');
    content.className = 'action-list__content';

    const title = document.createElement('span');
    title.className = 'action-list__title';
    title.textContent = entry.title || '';
    content.appendChild(title);

    if (entry.subtitle) {
      const subtitle = document.createElement('span');
      subtitle.className = 'action-list__subtitle';
      subtitle.textContent = entry.subtitle;
      content.appendChild(subtitle);
    }

    if (entry.meta) {
      const meta = document.createElement('span');
      const metaClasses = ['action-list__meta'];
      if (entry.metaClass) {
        metaClasses.push(entry.metaClass);
      }
      meta.className = metaClasses.join(' ');
      meta.textContent = entry.meta;
      content.appendChild(meta);
    }

    const actions = document.createElement('div');
    actions.className = 'action-list__actions';

    const button = document.createElement('button');
    button.type = 'button';
    const buttonClasses = ['action-list__button'];
    if (buttonClass) {
      buttonClasses.push(...String(buttonClass).split(' ').filter(Boolean));
    } else {
      buttonClasses.push('primary');
    }
    button.className = buttonClasses.join(' ');
    button.textContent = entry.buttonLabel || defaultLabel || 'Select';
    if (typeof entry.onClick === 'function') {
      button.addEventListener('click', () => entry.onClick?.());
    }

    actions.appendChild(button);

    item.append(content, actions);
    container.appendChild(item);
  });
}

function renderDailyList(container, entries, emptyMessage, limit = 3) {
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!list.length) {
    if (!emptyMessage) return;
    const empty = document.createElement('li');
    empty.className = 'daily-stats__empty';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.slice(0, limit).forEach(entry => {
    const item = createDailyListItem(entry);
    container.appendChild(item);
  });
}

function describeQueue(summary) {
  const entries = Array.isArray(summary?.timeBreakdown) ? summary.timeBreakdown : [];
  if (!entries.length) {
    return [
      {
        label: 'Nothing queued yet',
        detail: 'Open hustles to schedule your next move.',
        hours: 0,
        state: 'idle'
      }
    ];
  }

  return entries.slice(0, 6).map(entry => ({
    id: entry.key,
    label: entry.label,
    detail: entry.value,
    hours: Number(entry.hours) || 0,
    state: entry.category === 'maintenance' ? 'maintenance' : 'active'
  }));
}

export function buildQuickActions(state) {
  const items = [];
  for (const hustle of registry.hustles) {
    if (hustle?.tag?.type === 'study') continue;
    if (!hustle?.action?.onClick) continue;
    const disabled = typeof hustle.action.disabled === 'function'
      ? hustle.action.disabled(state)
      : Boolean(hustle.action.disabled);
    if (disabled) continue;
    const payout = Number(hustle.payout?.amount) || 0;
    const time = Number(hustle.time || hustle.action?.timeCost) || 1;
    const roi = time > 0 ? payout / time : payout;
    items.push({
      id: hustle.id,
      label: hustle.name,
      primaryLabel: typeof hustle.action.label === 'function'
        ? hustle.action.label(state)
        : hustle.action.label || 'Queue',
      description: `${formatMoney(payout)} payout • ${formatHours(time)}`,
      onClick: hustle.action.onClick,
      roi,
      timeCost: time
    });
  }

  items.sort((a, b) => b.roi - a.roi);
  return items.slice(0, 4);
}

export function buildAssetUpgradeRecommendations(state) {
  if (!state) return [];

  const suggestions = [];

  for (const asset of registry.assets) {
    const qualityActions = getQualityActions(asset);
    if (!qualityActions.length) continue;

    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    if (!instances.length) continue;

    const tracks = getQualityTracks(asset);

    instances.forEach(instance => {
      if (instance?.status !== 'active') return;

      const quality = instance.quality || {};
      const level = Math.max(0, Number(quality.level) || 0);
      const nextLevel = getNextQualityLevel(asset, level);
      if (!nextLevel?.requirements) return;

      const progress = quality.progress || {};
      const requirements = Object.entries(nextLevel.requirements);
      if (!requirements.length) return;

      const assetIndex = assetState.instances.indexOf(instance);
      const label = instanceLabel(asset, assetIndex >= 0 ? assetIndex : 0);
      const performance = Math.max(0, Number(instance.lastIncome) || 0);

      requirements.forEach(([key, targetValue]) => {
        const target = Math.max(0, Number(targetValue) || 0);
        if (target <= 0) return;
        const current = Math.max(0, Number(progress?.[key]) || 0);
        const remaining = Math.max(0, target - current);
        if (remaining <= 0) return;

        const action = qualityActions.find(entry => entry.progressKey === key);
        if (!action) return;
        if (!canPerformQualityAction(asset, instance, action, state)) return;

        const completion = target > 0 ? Math.min(1, current / target) : 1;
        const percentComplete = Math.max(0, Math.min(100, Math.round(completion * 100)));
        const percentRemaining = Math.max(0, 100 - percentComplete);
        const track = tracks?.[key] || {};
        const requirementLabel = track.shortLabel || track.label || key;
        const timeCost = Math.max(0, Number(action.time) || 0);
        const moneyCost = Math.max(0, Number(action.cost) || 0);
        const effortParts = [];
        if (timeCost > 0) {
          effortParts.push(`${formatHours(timeCost)} focus`);
        }
        if (moneyCost > 0) {
          effortParts.push(`$${formatMoney(moneyCost)}`);
        }
        const progressNote = `${Math.min(current, target)}/${target} logged (${percentComplete}% complete)`;
        const meta = effortParts.length ? `${progressNote} • ${effortParts.join(' • ')}` : progressNote;
        const actionLabel = typeof action.label === 'function'
          ? action.label({ definition: asset, instance, state })
          : action.label;
        const buttonLabel = actionLabel || 'Boost Quality';

        suggestions.push({
          id: `asset-upgrade:${asset.id}:${instance.id}:${action.id}:${key}`,
          title: `${label} · ${buttonLabel}`,
          subtitle: `${remaining} ${requirementLabel} to go for Quality ${nextLevel.level} (${percentRemaining}% to go).`,
          meta,
          buttonLabel,
          onClick: () => performQualityAction(asset.id, instance.id, action.id),
          performance,
          completion,
          remaining,
          level,
          timeCost
        });
      });
    });
  }

  suggestions.sort((a, b) => {
    if (a.performance !== b.performance) {
      return a.performance - b.performance;
    }
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    if (a.completion !== b.completion) {
      return a.completion - b.completion;
    }
    if (a.remaining !== b.remaining) {
      return b.remaining - a.remaining;
    }
    return a.title.localeCompare(b.title);
  });

  return suggestions;
}

function buildNotifications(state) {
  const notifications = [];

  for (const asset of registry.assets) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const maintenanceDue = instances.filter(instance => instance.status === 'active' && !instance.maintenanceFundedToday);
    if (maintenanceDue.length) {
      notifications.push({
        id: `${asset.id}:maintenance`,
        label: `${asset.name} needs upkeep`,
        message: `${maintenanceDue.length} build${maintenanceDue.length === 1 ? '' : 's'} waiting for maintenance`,
        action: () => {
          elements.shellTabs.find(tab => tab.id === 'tab-assets')?.click();
        }
      });
    }
  }

  const affordableUpgrades = registry.upgrades.filter(upgrade => {
    const cost = Number(upgrade.cost) || 0;
    if (cost <= 0) return false;
    const owned = getState()?.upgrades?.[upgrade.id]?.purchased;
    if (owned && !upgrade.repeatable) return false;
    return getState()?.money >= cost;
  });

  affordableUpgrades.slice(0, 3).forEach(upgrade => {
    notifications.push({
      id: `${upgrade.id}:upgrade`,
      label: `${upgrade.name} is affordable`,
      message: `$${formatMoney(upgrade.cost)} ready to invest`,
      action: () => {
        elements.shellTabs.find(tab => tab.id === 'tab-upgrades')?.click();
      }
    });
  });

  return notifications;
}

function renderQueue(summary) {
  const container = elements.actionQueue;
  if (!container) return;
  container.innerHTML = '';
  const items = describeQueue(summary);
  for (const item of items) {
    const li = document.createElement('li');
    li.dataset.state = item.state;
    const label = document.createElement('div');
    label.className = 'queue__meta';
    const title = document.createElement('strong');
    title.textContent = item.label;
    label.appendChild(title);
    if (item.detail) {
      const detail = document.createElement('span');
      detail.className = 'queue__detail';
      detail.textContent = item.detail;
      label.appendChild(detail);
    }
    const hours = document.createElement('span');
    hours.className = 'queue__hours';
    hours.textContent = formatHours(item.hours);
    li.append(label, hours);
    container.appendChild(li);
  }
}

function renderQuickActions(state) {
  const container = elements.quickActions;
  const suggestions = buildQuickActions(state);
  const entries = suggestions.map(action => ({
    title: action.label,
    subtitle: action.description,
    buttonLabel: action.primaryLabel,
    onClick: action.onClick
  }));

  renderActionSection(container, entries, {
    emptyMessage: 'No ready actions. Check upgrades or assets.',
    buttonClass: 'primary',
    defaultLabel: 'Queue'
  });
}

function renderAssetUpgradeActions(state) {
  const container = elements.assetUpgradeActions;
  const suggestions = buildAssetUpgradeRecommendations(state);
  const entries = suggestions.map(action => ({
    title: action.title,
    subtitle: action.subtitle,
    meta: action.meta,
    metaClass: 'upgrade-actions__meta',
    buttonLabel: action.buttonLabel,
    onClick: action.onClick
  }));

  renderActionSection(container, entries, {
    emptyMessage: 'Every asset is humming along. Check back after today’s upkeep.',
    buttonClass: 'secondary',
    defaultLabel: 'Boost'
  });
}

function renderNotifications(state) {
  const container = elements.notifications;
  if (!container) return;
  container.innerHTML = '';
  const entries = buildNotifications(state);
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.textContent = 'All clear. Nothing urgent on deck.';
    container.appendChild(empty);
    return;
  }

  entries.slice(0, 4).forEach(entry => {
    const item = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'notifications__info';
    const title = document.createElement('span');
    title.textContent = entry.label;
    const message = document.createElement('span');
    message.textContent = entry.message;
    message.className = 'notifications__message';
    info.append(title, message);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.textContent = 'Open';
    button.addEventListener('click', () => entry.action?.());
    item.append(info, button);
    container.appendChild(item);
  });
}

function renderEventPreview(state) {
  const container = elements.eventLogPreview;
  if (!container) return;
  container.innerHTML = '';
  const log = Array.isArray(state?.log) ? [...state.log] : [];
  if (!log.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Log is quiet. Run a hustle or buy an upgrade.';
    container.appendChild(empty);
    return;
  }

  log
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4)
    .forEach(entry => {
      const block = document.createElement('article');
      block.className = 'event-preview__item';
      const time = document.createElement('span');
      time.className = 'event-preview__time';
      time.textContent = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const message = document.createElement('p');
      message.className = 'event-preview__message';
      message.textContent = entry.message;
      block.append(time, message);
      container.appendChild(block);
    });
}

function computeAssetMetrics(state) {
  let activeAssets = 0;
  let upkeepDue = 0;

  for (const asset of registry.assets) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (instance.status === 'active') {
        activeAssets += 1;
        if (!instance.maintenanceFundedToday) {
          upkeepDue += Number(asset.maintenance?.cost) || 0;
        }
      }
    });
  }

  return { activeAssets, upkeepDue };
}

function computeStudyProgress(state) {
  const tracks = Object.values(KNOWLEDGE_TRACKS);
  if (!tracks.length) {
    return { percent: 0, summary: 'No study tracks unlocked yet.' };
  }
  let enrolled = 0;
  let completed = 0;
  let totalProgress = 0;
  tracks.forEach(track => {
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled) return;
    enrolled += 1;
    if (progress.completed) {
      completed += 1;
      totalProgress += 1;
    } else {
      const fraction = Math.min(1, progress.daysCompleted / Math.max(1, track.days));
      totalProgress += fraction;
    }
  });
  const percent = enrolled > 0 ? Math.round((totalProgress / enrolled) * 100) : 0;
  const summary = enrolled
    ? `${completed}/${enrolled} finished • ${percent}% average progress`
    : 'No active study tracks.';
  return { percent, summary };
}

function renderDailyStats(summary) {
  const refs = elements.dailyStats || {};
  if (!refs) return;

  const {
    timeSummary,
    timeList,
    earningsSummary,
    earningsActive,
    earningsPassive,
    spendSummary,
    spendList,
    studySummary,
    studyList
  } = refs;

  const totalTime = Math.max(0, Number(summary.totalTime) || 0);
  const setupHours = Math.max(0, Number(summary.setupHours) || 0);
  const maintenanceHours = Math.max(0, Number(summary.maintenanceHours) || 0);
  const otherTimeHours = Math.max(0, Number(summary.otherTimeHours) || 0);
  const timeSummaryText = totalTime > 0
    ? `${formatHours(totalTime)} invested • ${formatHours(setupHours)} setup • ${formatHours(maintenanceHours)} upkeep • ${formatHours(otherTimeHours)} flex`
    : 'No hours logged yet. Queue a hustle to get moving.';
  setText(timeSummary, timeSummaryText);
  renderDailyList(timeList, summary.timeBreakdown, 'Time tracking kicks off after your first action.');

  const totalEarnings = Math.max(0, Number(summary.totalEarnings) || 0);
  const activeEarnings = Math.max(0, Number(summary.activeEarnings) || 0);
  const passiveEarnings = Math.max(0, Number(summary.passiveEarnings) || 0);
  const earningsSummaryText = totalEarnings > 0
    ? `$${formatMoney(totalEarnings)} earned • $${formatMoney(activeEarnings)} active • $${formatMoney(passiveEarnings)} passive`
    : 'Payouts will appear once you start closing deals.';
  setText(earningsSummary, earningsSummaryText);
  renderDailyList(earningsActive, summary.earningsBreakdown, 'Active gigs will report here.', 3);
  renderDailyList(earningsPassive, summary.passiveBreakdown, 'Passive and offline streams update after upkeep.', 3);

  const totalSpend = Math.max(0, Number(summary.totalSpend) || 0);
  const upkeepSpend = Math.max(0, Number(summary.upkeepSpend) || 0);
  const investmentSpend = Math.max(0, Number(summary.investmentSpend) || 0);
  const spendSummaryText = totalSpend > 0
    ? `$${formatMoney(totalSpend)} spent • $${formatMoney(upkeepSpend)} upkeep • $${formatMoney(investmentSpend)} investments`
    : 'Outflows land here when upkeep and investments fire.';
  setText(spendSummary, spendSummaryText);
  renderDailyList(spendList, summary.spendBreakdown, 'No cash out yet. Fund upkeep or buy an upgrade.', 3);

  const knowledgeInProgress = Math.max(0, Number(summary.knowledgeInProgress) || 0);
  const knowledgePending = Math.max(0, Number(summary.knowledgePendingToday) || 0);
  const studySummaryText = knowledgeInProgress > 0
    ? `${knowledgeInProgress} track${knowledgeInProgress === 1 ? '' : 's'} in flight • ${knowledgePending > 0 ? `${knowledgePending} session${knowledgePending === 1 ? '' : 's'} waiting today` : 'All sessions logged today'}`
    : 'Enroll in a track to kickstart your learning streak.';
  setText(studySummary, studySummaryText);
  renderDailyList(studyList, summary.studyBreakdown, 'Your courses will list here once enrolled.', 3);
}

function renderNicheWidget(state) {
  const refs = elements.nicheTrends || {};
  const {
    list,
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote,
    risingList,
    coolingList
  } = refs;

  if (list) list.innerHTML = '';
  if (risingList) risingList.innerHTML = '';
  if (coolingList) coolingList.innerHTML = '';

  const setHighlight = (valueEl, noteEl, valueText, noteText) => {
    if (valueEl) valueEl.textContent = valueText;
    if (noteEl) noteEl.textContent = noteText;
  };

  const roster = getNicheRoster(state) || [];
  if (!roster.length) {
    setHighlight(
      highlightHot,
      highlightHotNote,
      'No readings yet',
      'Assign a niche to start tracking buzz.'
    );
    setHighlight(
      highlightSwing,
      highlightSwingNote,
      'Awaiting data',
      'Fresh deltas will appear after the first reroll.'
    );
    setHighlight(
      highlightRisk,
      highlightRiskNote,
      'All calm',
      'We’ll flag niches that are cooling off fast.'
    );

    if (list) {
      const empty = document.createElement('li');
      empty.className = 'niche-pulse__empty';
      empty.textContent = 'Assign a niche to an asset to start tracking demand swings.';
      list.appendChild(empty);
    }

    const emptyMomentum = text => {
      const item = document.createElement('li');
      item.className = 'niche-momentum__empty';
      item.textContent = text;
      return item;
    };

    if (risingList) {
      risingList.appendChild(emptyMomentum('No rising trends yet.')); 
    }
    if (coolingList) {
      coolingList.appendChild(emptyMomentum('No cooling trends yet.'));
    }
    return;
  }

  const sanitizeScore = score => {
    if (!Number.isFinite(score)) return null;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const formatDelta = delta => {
    if (!Number.isFinite(delta)) return 'Fresh reading';
    if (delta === 0) return 'Holding steady';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta} vs yesterday`;
  };

  const formatImpact = multiplier => {
    if (!Number.isFinite(multiplier)) return 'Payout impact ±0%';
    const percent = Math.round((multiplier - 1) * 100);
    const sign = percent > 0 ? '+' : '';
    return `Payout impact ${sign}${percent}%`;
  };

  const buildSummaryNote = (entry, fallback) => {
    if (!entry) return fallback;
    const popularity = entry.popularity || {};
    const parts = [];
    const score = sanitizeScore(popularity.score);
    if (score !== null) parts.push(`${score}/100 interest`);
    if (popularity.label) parts.push(popularity.label.toLowerCase());
    const multiplier = Number(popularity.multiplier);
    if (Number.isFinite(multiplier)) {
      const percent = Math.round((multiplier - 1) * 100);
      const sign = percent > 0 ? '+' : '';
      parts.push(`payout ${sign}${percent}%`);
    }
    const summary = popularity.summary;
    const text = parts.length ? parts.join(' • ') : null;
    return summary ? `${text ? `${text}. ` : ''}${summary}` : text || fallback;
  };

  const hottest = roster.find(entry => Number.isFinite(entry?.popularity?.score)) || roster[0];
  if (hottest) {
    const name = hottest.definition?.name || 'Untitled niche';
    setHighlight(
      highlightHot,
      highlightHotNote,
      name,
      buildSummaryNote(hottest, 'Popularity data incoming soon.')
    );
  }

  const deltaEntries = roster.filter(entry => Number.isFinite(entry?.popularity?.delta));
  const risingEntries = deltaEntries
    .filter(entry => Number(entry.popularity.delta) > 0)
    .sort((a, b) => Number(b.popularity.delta) - Number(a.popularity.delta));
  const coolingEntries = deltaEntries
    .filter(entry => Number(entry.popularity.delta) < 0)
    .sort((a, b) => Number(a.popularity.delta) - Number(b.popularity.delta));

  const swingSource = risingEntries.length
    ? risingEntries[0]
    : deltaEntries.sort((a, b) => Number(b.popularity.delta) - Number(a.popularity.delta))[0];

  if (swingSource) {
    const name = swingSource.definition?.name || 'Untitled niche';
    const delta = Number(swingSource.popularity?.delta) || 0;
    const sign = delta > 0 ? '+' : '';
    setHighlight(
      highlightSwing,
      highlightSwingNote,
      `${name} ${sign}${delta}`,
      swingSource.popularity?.summary || formatDelta(delta)
    );
  } else {
    setHighlight(
      highlightSwing,
      highlightSwingNote,
      'Awaiting data',
      'Fresh deltas will appear after the first reroll.'
    );
  }

  let riskSource = null;
  let lowestMultiplier = Infinity;
  roster.forEach(entry => {
    const multiplier = Number(entry?.popularity?.multiplier);
    if (Number.isFinite(multiplier) && multiplier < lowestMultiplier) {
      lowestMultiplier = multiplier;
      riskSource = entry;
    }
  });
  if (!riskSource && coolingEntries.length) {
    riskSource = coolingEntries[0];
  }
  if (!riskSource && roster.length) {
    riskSource = roster[roster.length - 1];
  }

  if (riskSource) {
    const name = riskSource.definition?.name || 'Untitled niche';
    const multiplier = Number(riskSource.popularity?.multiplier);
    const percent = Number.isFinite(multiplier)
      ? Math.round((multiplier - 1) * 100)
      : 0;
    const sign = percent > 0 ? '+' : '';
    const value = Number.isFinite(multiplier)
      ? `${name} ${sign}${percent}%`
      : name;
    setHighlight(
      highlightRisk,
      highlightRiskNote,
      value,
      riskSource.popularity?.summary || formatDelta(Number(riskSource.popularity?.delta))
    );
  }

  const createPulseItem = entry => {
    const definition = entry.definition || {};
    const popularity = entry.popularity || {};
    const item = document.createElement('li');
    item.className = 'niche-pulse__item';
    if (popularity.tone) {
      item.dataset.tone = popularity.tone;
    }

    const row = document.createElement('div');
    row.className = 'niche-pulse__row';

    const identity = document.createElement('div');
    identity.className = 'niche-pulse__identity';

    const name = document.createElement('span');
    name.className = 'niche-pulse__name';
    name.textContent = definition.name || 'Untitled niche';
    identity.appendChild(name);

    const badge = document.createElement('span');
    badge.className = 'niche-pulse__badge';
    badge.textContent = popularity.label || 'Unknown';
    identity.appendChild(badge);

    row.appendChild(identity);

    const scoreWrap = document.createElement('div');
    scoreWrap.className = 'niche-pulse__score';

    const scoreValue = document.createElement('span');
    scoreValue.className = 'niche-pulse__score-value';
    const normalizedScore = sanitizeScore(popularity.score);
    scoreValue.textContent = normalizedScore !== null
      ? `${normalizedScore}/100 interest`
      : 'Interest pending';
    scoreWrap.appendChild(scoreValue);

    const bar = document.createElement('div');
    bar.className = 'niche-pulse__bar';
    bar.setAttribute('role', 'presentation');
    const fill = document.createElement('div');
    fill.className = 'niche-pulse__bar-fill';
    const width = normalizedScore !== null ? `${normalizedScore}%` : '0%';
    fill.style.setProperty('--width', width);
    bar.appendChild(fill);
    scoreWrap.appendChild(bar);

    const delta = document.createElement('span');
    delta.className = 'niche-pulse__delta';
    delta.textContent = formatDelta(Number(popularity.delta));
    scoreWrap.appendChild(delta);

    row.appendChild(scoreWrap);
    item.appendChild(row);

    const meta = document.createElement('div');
    meta.className = 'niche-pulse__meta';

    const impact = document.createElement('span');
    impact.className = 'niche-pulse__impact';
    impact.textContent = formatImpact(Number(popularity.multiplier));
    meta.appendChild(impact);

    const status = document.createElement('span');
    status.textContent = popularity.summary || 'Popularity data incoming soon.';
    meta.appendChild(status);

    item.appendChild(meta);

    if (definition.description) {
      const description = document.createElement('p');
      description.className = 'niche-pulse__description';
      description.textContent = definition.description;
      item.appendChild(description);
    }

    return item;
  };

  roster.forEach(entry => {
    if (!entry || !list) return;
    list.appendChild(createPulseItem(entry));
  });

  const renderMomentum = (target, entries, emptyText, trend) => {
    if (!target) return;
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'niche-momentum__empty';
      empty.textContent = emptyText;
      target.appendChild(empty);
      return;
    }

    entries.slice(0, 4).forEach(entry => {
      const popularity = entry.popularity || {};
      const item = document.createElement('li');
      item.className = 'niche-momentum__item';
      item.dataset.trend = trend;

      const name = document.createElement('span');
      name.className = 'niche-momentum__name';
      name.textContent = entry.definition?.name || 'Untitled niche';
      item.appendChild(name);

      const change = document.createElement('span');
      change.className = 'niche-momentum__change';
      change.textContent = formatDelta(Number(popularity.delta));
      item.appendChild(change);

      const impact = document.createElement('span');
      impact.className = 'niche-momentum__impact';
      impact.textContent = formatImpact(Number(popularity.multiplier));
      item.appendChild(impact);

      target.appendChild(item);
    });
  };

  renderMomentum(
    risingList,
    risingEntries,
    'No rising trends yet.',
    'up'
  );

  renderMomentum(
    coolingList,
    coolingEntries,
    'No cooling trends yet.',
    'down'
  );
}

export function renderDashboard(summary) {
  const state = getState();
  if (!state) return;

  const hoursLeft = Math.max(0, Number(state.timeLeft) || 0);
  setText(
    elements.sessionStatus,
    `Day ${state.day} • ${formatHours(hoursLeft)} remaining`
  );

  setText(elements.money, `$${formatMoney(state.money)}`);

  const headerStats = elements.headerStats || {};
  const dailyEarnings = Math.max(0, Number(summary.totalEarnings) || 0);
  const activeEarnings = Math.max(0, Number(summary.activeEarnings) || 0);
  const passiveEarnings = Math.max(0, Number(summary.passiveEarnings) || 0);
  const dailySpend = Math.max(0, Number(summary.totalSpend) || 0);
  const upkeepSpend = Math.max(0, Number(summary.upkeepSpend) || 0);
  const investmentSpend = Math.max(0, Number(summary.investmentSpend) || 0);
  const timeCap = getTimeCap();
  const reservedHours = Math.max(0, timeCap - hoursLeft);
  const setupHours = Math.max(0, Number(summary.setupHours) || 0);
  const maintenanceHours = Math.max(0, Number(summary.maintenanceHours) || 0);
  const flexHours = Math.max(0, reservedHours - setupHours - maintenanceHours);

  setText(headerStats.dailyPlus?.value, `$${formatMoney(dailyEarnings)}`);
  const incomeSegments = [];
  if (activeEarnings > 0) {
    incomeSegments.push(`$${formatMoney(activeEarnings)} active`);
  }
  if (passiveEarnings > 0) {
    incomeSegments.push(`$${formatMoney(passiveEarnings)} passive`);
  }
  setText(
    headerStats.dailyPlus?.note,
    incomeSegments.length
      ? incomeSegments.join(' • ')
      : 'Waiting on payouts'
  );

  setText(headerStats.dailyMinus?.value, `$${formatMoney(dailySpend)}`);
  const spendSegments = [];
  if (upkeepSpend > 0) {
    spendSegments.push(`$${formatMoney(upkeepSpend)} upkeep`);
  }
  if (investmentSpend > 0) {
    spendSegments.push(`$${formatMoney(investmentSpend)} invest`);
  }
  const dailyNet = dailyEarnings - dailySpend;
  if (dailyNet !== 0) {
    const netLabel = `${dailyNet >= 0 ? 'Net +' : 'Net -'}$${formatMoney(Math.abs(dailyNet))}`;
    spendSegments.push(netLabel);
  }
  setText(
    headerStats.dailyMinus?.note,
    spendSegments.length ? spendSegments.join(' • ') : 'No cash out yet'
  );

  setText(headerStats.timeAvailable?.value, formatHours(hoursLeft));
  setText(
    headerStats.timeAvailable?.note,
    `Cap ${formatHours(timeCap)}`
  );
  setText(headerStats.timeReserved?.value, formatHours(reservedHours));
  const reservedSegments = [];
  if (setupHours > 0) {
    reservedSegments.push(`${formatHours(setupHours)} setup`);
  }
  if (maintenanceHours > 0) {
    reservedSegments.push(`${formatHours(maintenanceHours)} upkeep`);
  }
  if (flexHours > 0) {
    reservedSegments.push(`${formatHours(flexHours)} hustle`);
  }
  setText(
    headerStats.timeReserved?.note,
    reservedSegments.length ? reservedSegments.join(' • ') : 'Queue is wide open'
  );

  const net = summary.totalEarnings - summary.totalSpend;
  setText(elements.kpiValues.net, `$${formatMoney(net)}`);
  setText(elements.kpiNotes.net, `${formatMoney(summary.totalEarnings)} earned • ${formatMoney(summary.totalSpend)} spent`);

  setText(elements.kpiValues.hours, `${formatHours(hoursLeft)}`);
  setText(elements.kpiNotes.hours, hoursLeft > 0 ? 'Plenty of hustle hours left.' : 'Day is tapped out.');

  const { activeAssets, upkeepDue } = computeAssetMetrics(state);
  setText(elements.kpiValues.upkeep, `$${formatMoney(upkeepDue)}`);
  setText(elements.kpiNotes.upkeep, upkeepDue > 0 ? 'Maintain assets soon.' : 'Upkeep funded.');

  setText(elements.kpiValues.assets, String(activeAssets));
  setText(elements.kpiNotes.assets, activeAssets > 0 ? 'Streams humming.' : 'Launch your first asset.');

  const { percent, summary: studySummary } = computeStudyProgress(state);
  setText(elements.kpiValues.study, `${percent}%`);
  setText(elements.kpiNotes.study, studySummary);

  renderQueue(summary);
  renderQuickActions(state);
  renderAssetUpgradeActions(state);
  renderNotifications(state);
  renderEventPreview(state);
  renderNicheWidget(state);
  renderDailyStats(summary);
}
