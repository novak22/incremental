import {
  getAssetUpgradeActionsContainer,
  getDailyStats,
  getEventLogPreviewNode,
  getHeaderStats,
  getKpiNotes,
  getKpiValues,
  getMoneyNode,
  getNicheTrends,
  getNotificationsContainer,
  getQueueNodes,
  getQuickActionsContainer,
  getSessionStatusNode,
  getShellNavigation
} from './elements/registry.js';
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
import { getNicheRoster, getNicheWatchlist, setNicheWatchlist } from '../game/assets/niches.js';
import { activateShellPanel } from './layout.js';

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
  const { shellTabs = [] } = getShellNavigation() || {};

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
          shellTabs.find(tab => tab.id === 'tab-assets')?.click();
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
        shellTabs.find(tab => tab.id === 'tab-upgrades')?.click();
      }
    });
  });

  return notifications;
}

function renderQueue(summary) {
  const container = getQueueNodes()?.actionQueue;
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
  const container = getQuickActionsContainer();
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
  const container = getAssetUpgradeActionsContainer();
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
  const container = getNotificationsContainer();
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
  const container = getEventLogPreviewNode();
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
  const refs = getDailyStats() || {};

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

const nicheViewState = {
  sort: 'impact',
  investedOnly: false,
  watchlistOnly: false
};
let nicheControlsBound = false;
let assetHighlightTimer = null;

function refreshNicheWidget() {
  const state = getState();
  if (state) {
    renderNicheWidget(state);
  }
}

function setupNicheControls() {
  if (nicheControlsBound) return;
  const refs = getNicheTrends() || {};
  const buttons = Array.isArray(refs.sortButtons) ? refs.sortButtons : [];
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const sort = button.dataset.nicheSort || 'impact';
      if (sort === nicheViewState.sort) return;
      nicheViewState.sort = sort;
      refreshNicheWidget();
    });
  });
  refs.filterInvested?.addEventListener('change', event => {
    nicheViewState.investedOnly = Boolean(event.target?.checked);
    refreshNicheWidget();
  });
  refs.filterWatchlist?.addEventListener('change', event => {
    nicheViewState.watchlistOnly = Boolean(event.target?.checked);
    refreshNicheWidget();
  });
  nicheControlsBound = true;
}

function updateNicheControlStates({ watchlistCount = 0 } = {}) {
  const refs = getNicheTrends() || {};
  const buttons = Array.isArray(refs.sortButtons) ? refs.sortButtons : [];
  buttons.forEach(button => {
    const isActive = (button.dataset.nicheSort || 'impact') === nicheViewState.sort;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  if (refs.filterInvested) {
    refs.filterInvested.checked = nicheViewState.investedOnly;
  }
  if (refs.filterWatchlist) {
    const disabled = watchlistCount === 0;
    refs.filterWatchlist.disabled = disabled;
    if (disabled) {
      refs.filterWatchlist.checked = false;
      refs.filterWatchlist.title = 'Add niches to your watchlist to use this filter.';
      if (nicheViewState.watchlistOnly) {
        nicheViewState.watchlistOnly = false;
      }
    } else {
      refs.filterWatchlist.checked = nicheViewState.watchlistOnly;
      refs.filterWatchlist.title = '';
    }
  }
}

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeDelta(popularity = {}) {
  const raw = Number(popularity.delta);
  if (!Number.isFinite(raw)) return 'Fresh reading';
  if (raw === 0) return 'Holding steady';
  const sign = raw > 0 ? '+' : '';
  return `${sign}${raw} vs yesterday`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  const percent = Math.round(value * 100);
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}

function describeTrendStatus(entry) {
  if (!entry) return 'Steady';
  const { popularity = {}, assetCount, watchlisted } = entry;
  if (watchlisted && assetCount === 0) return 'Watchlist';
  const delta = Number(popularity.delta);
  if (Number.isFinite(delta)) {
    if (delta >= 6) return 'Heating Up';
    if (delta <= -6) return 'Cooling Off';
  }
  const score = Number(popularity.score);
  if (Number.isFinite(score)) {
    if (score >= 70) return 'Trending';
    if (score <= 40) return 'Cooling Off';
  }
  return 'Steady';
}

function buildNicheAnalytics(state) {
  const roster = getNicheRoster(state) || [];
  const watchlist = getNicheWatchlist(state);
  const stats = new Map();
  roster.forEach(entry => {
    const id = entry?.definition?.id;
    if (!id) return;
    stats.set(id, {
      id,
      definition: entry.definition,
      popularity: entry.popularity || {},
      watchlisted: watchlist.has(id),
      assetCount: 0,
      netEarnings: 0,
      trendImpact: 0,
      baselineEarnings: 0,
      assetBreakdown: new Map()
    });
  });

  registry.assets.forEach(asset => {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (!instance) return;
      const nicheId = typeof instance.nicheId === 'string' ? instance.nicheId : null;
      if (!nicheId) return;
      const target = stats.get(nicheId);
      if (!target) return;
      target.assetCount += 1;
      const label = asset.singular || asset.name || 'Asset';
      target.assetBreakdown.set(label, (target.assetBreakdown.get(label) || 0) + 1);

      const breakdownData = instance.lastIncomeBreakdown;
      const total = Number(breakdownData?.total);
      const payout = Number.isFinite(total) ? total : Number(instance.lastIncome);
      const actual = Math.max(0, Number.isFinite(payout) ? payout : 0);
      const entries = Array.isArray(breakdownData?.entries) ? breakdownData.entries : [];
      const trendDelta = entries.reduce((sum, item) => {
        if (!item || item.type !== 'niche') return sum;
        const amount = Number(item.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
      const baseline = actual - trendDelta;
      target.netEarnings += actual;
      target.trendImpact += trendDelta;
      target.baselineEarnings += Math.max(0, baseline);
    });
  });

  return Array.from(stats.values()).map(entry => {
    const assetBreakdown = Array.from(entry.assetBreakdown.entries()).map(([name, count]) => ({ name, count }));
    return {
      ...entry,
      assetBreakdown,
      netEarnings: Math.round(entry.netEarnings * 100) / 100,
      trendImpact: Math.round(entry.trendImpact * 100) / 100,
      baselineEarnings: Math.round(entry.baselineEarnings * 100) / 100,
      status: describeTrendStatus(entry)
    };
  });
}

function focusAssetsForNiche(nicheId, { hasAssets = false, nicheName = '' } = {}) {
  if (!nicheId) return;
  activateShellPanel('panel-assets');
  const { assetGallery, sessionStatus } = elements;
  if (!assetGallery) return;
  window.requestAnimationFrame(() => {
    const cards = Array.from(assetGallery.querySelectorAll('[data-asset]'));
    const matches = cards.filter(card => card.dataset.niche === nicheId);
    cards.forEach(card => card.classList.remove('asset-overview-card--spotlight'));
    if (!matches.length) {
      if (sessionStatus) {
        sessionStatus.textContent = hasAssets
          ? 'No payouts recorded yet. Fund upkeep to roll today\'s earnings.'
          : 'No assets targeting this niche yet. Open an asset card to assign one.';
      }
      return;
    }
    if (sessionStatus) {
      const label = nicheName || 'this niche';
      sessionStatus.textContent = `Spotlighting assets tuned to ${label}.`;
    }
    matches.forEach(card => card.classList.add('asset-overview-card--spotlight'));
    const first = matches[0];
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (assetHighlightTimer) clearTimeout(assetHighlightTimer);
    assetHighlightTimer = setTimeout(() => {
      matches.forEach(card => card.classList.remove('asset-overview-card--spotlight'));
    }, 2200);
  });
}

function createNicheCard(entry) {
  if (!entry) return null;
  const card = document.createElement('article');
  card.className = 'niche-card';
  card.setAttribute('role', 'listitem');
  if (entry.popularity?.tone) {
    card.dataset.tone = entry.popularity.tone;
  }
  card.dataset.invested = entry.assetCount > 0 ? 'true' : 'false';
  card.dataset.watchlisted = entry.watchlisted ? 'true' : 'false';

  const header = document.createElement('header');
  header.className = 'niche-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'niche-card__title';

  const name = document.createElement('h4');
  name.className = 'niche-card__name';
  name.textContent = entry.definition?.name || 'Untitled niche';
  titleWrap.appendChild(name);

  const status = document.createElement('span');
  status.className = 'niche-card__status';
  status.textContent = entry.status || 'Steady';
  titleWrap.appendChild(status);

  header.appendChild(titleWrap);

  const score = document.createElement('p');
  score.className = 'niche-card__score';
  const normalizedScore = clampScore(entry.popularity?.score);
  score.textContent = normalizedScore !== null ? normalizedScore : '–';
  header.appendChild(score);

  card.appendChild(header);

  const meter = document.createElement('div');
  meter.className = 'niche-card__meter';
  meter.setAttribute('role', 'progressbar');
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  meter.setAttribute('aria-valuenow', normalizedScore !== null ? String(normalizedScore) : '0');
  const fill = document.createElement('div');
  fill.className = 'niche-card__meter-fill';
  fill.style.setProperty('--fill', normalizedScore !== null ? `${normalizedScore}%` : '0%');
  meter.appendChild(fill);
  card.appendChild(meter);

  const globalSection = document.createElement('section');
  globalSection.className = 'niche-card__section';
  const globalHeading = document.createElement('h5');
  globalHeading.textContent = 'Global momentum';
  globalSection.appendChild(globalHeading);

  const multiplier = Number(entry.popularity?.multiplier);
  const payoutText = Number.isFinite(multiplier)
    ? (multiplier === 1 ? 'Baseline payouts' : `${formatPercent(multiplier - 1)} payouts`)
    : 'Payout data pending';
  const globalStat = document.createElement('p');
  globalStat.className = 'niche-card__stat';
  globalStat.textContent = payoutText;
  globalSection.appendChild(globalStat);

  const globalNote = document.createElement('p');
  globalNote.className = 'niche-card__note';
  const noteParts = [];
  if (normalizedScore !== null) noteParts.push(`Score ${normalizedScore}`);
  const deltaText = describeDelta(entry.popularity);
  if (deltaText) noteParts.push(deltaText);
  if (entry.popularity?.label) noteParts.push(entry.popularity.label);
  globalNote.textContent = noteParts.join(' • ') || 'Trend scan warming up.';
  globalSection.appendChild(globalNote);

  card.appendChild(globalSection);

  const playerSection = document.createElement('section');
  playerSection.className = 'niche-card__section';
  const playerHeading = document.createElement('h5');
  playerHeading.textContent = 'Your empire';
  playerSection.appendChild(playerHeading);

  const playerStat = document.createElement('p');
  playerStat.className = 'niche-card__stat';
  if (entry.assetCount > 0) {
    playerStat.textContent = entry.assetCount === 1
      ? '1 asset active'
      : `${entry.assetCount} assets active`;
  } else if (entry.watchlisted) {
    playerStat.textContent = 'On your watchlist';
  } else {
    playerStat.textContent = 'No assets assigned yet';
  }
  playerSection.appendChild(playerStat);

  const earningsLine = document.createElement('p');
  earningsLine.className = 'niche-card__metric';
  if (entry.assetCount > 0) {
    earningsLine.textContent = entry.netEarnings > 0
      ? `$${formatMoney(entry.netEarnings)} earned today`
      : 'No payouts logged today.';
  } else {
    earningsLine.textContent = 'Assign an asset to tap this trend.';
  }
  playerSection.appendChild(earningsLine);

  if (entry.assetCount > 0) {
    const trendLine = document.createElement('p');
    trendLine.className = 'niche-card__trend';
    if (Math.abs(entry.trendImpact) >= 0.5) {
      const prefix = entry.trendImpact >= 0 ? '+' : '-';
      trendLine.textContent = `${prefix}$${formatMoney(Math.abs(entry.trendImpact))} from today's trend`;
      trendLine.classList.add(entry.trendImpact >= 0 ? 'niche-card__trend--positive' : 'niche-card__trend--negative');
      playerSection.appendChild(trendLine);

      const baselineNote = document.createElement('p');
      baselineNote.className = 'niche-card__note';
      baselineNote.textContent = `Baseline would land around $${formatMoney(entry.baselineEarnings)}.`;
      playerSection.appendChild(baselineNote);
    } else {
      trendLine.textContent = 'Trend impact is neutral today.';
      trendLine.classList.add('niche-card__trend--neutral');
      playerSection.appendChild(trendLine);
    }
  } else if (entry.watchlisted) {
    const watchNote = document.createElement('p');
    watchNote.className = 'niche-card__note';
    watchNote.textContent = 'Keep tabs on this niche and pivot when the hype spikes.';
    playerSection.appendChild(watchNote);
  }

  if (entry.assetBreakdown?.length) {
    const breakdown = document.createElement('p');
    breakdown.className = 'niche-card__note';
    const parts = entry.assetBreakdown.map(({ name, count }) =>
      count > 1 ? `${name} (${count})` : name
    );
    breakdown.textContent = `Assets: ${parts.join(', ')}`;
    playerSection.appendChild(breakdown);
  }

  card.appendChild(playerSection);

  const actions = document.createElement('div');
  actions.className = 'niche-card__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'ghost niche-card__action';
  viewButton.textContent = entry.assetCount > 0
    ? 'View assets in this niche'
    : 'Find assets for this niche';
  viewButton.addEventListener('click', () => {
    focusAssetsForNiche(entry.id, {
      hasAssets: entry.assetCount > 0,
      nicheName: entry.definition?.name
    });
  });
  actions.appendChild(viewButton);

  const watchlistButton = document.createElement('button');
  watchlistButton.type = 'button';
  watchlistButton.className = 'ghost niche-card__action';
  watchlistButton.textContent = entry.watchlisted ? 'Remove from watchlist' : 'Add to watchlist';
  watchlistButton.setAttribute('aria-pressed', String(entry.watchlisted));
  watchlistButton.addEventListener('click', () => {
    setNicheWatchlist(entry.id, !entry.watchlisted);
  });
  actions.appendChild(watchlistButton);

  const recommendButton = document.createElement('button');
  recommendButton.type = 'button';
  recommendButton.className = 'ghost niche-card__action';
  recommendButton.textContent = 'Queue recommended hustle';
  recommendButton.disabled = true;
  recommendButton.title = 'Coming soon: auto-queue the best hustle for this niche.';
  actions.appendChild(recommendButton);

  card.appendChild(actions);

  return card;
}

function updateDailyHighlights(analytics, refs) {
  const {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote
  } = refs;

  const invested = analytics.filter(entry => entry.assetCount > 0);
  const relevant = invested.length ? invested : analytics;
  const topImpact = relevant.slice().sort((a, b) => Math.abs(b.trendImpact) - Math.abs(a.trendImpact))[0];
  const fastestMove = analytics.slice().sort((a, b) => Math.abs(Number(b.popularity?.delta) || 0) - Math.abs(Number(a.popularity?.delta) || 0))[0];
  const negativePool = (invested.length ? invested : analytics).filter(entry => entry.trendImpact < 0);
  const biggestLoss = negativePool.sort((a, b) => a.trendImpact - b.trendImpact)[0];

  if (!topImpact) {
    if (highlightHot) highlightHot.textContent = 'No readings yet';
    if (highlightHotNote) highlightHotNote.textContent = 'Assign a niche to start tracking buzz.';
  } else {
    const impactValue = Math.abs(topImpact.trendImpact);
    const isPositive = topImpact.trendImpact >= 0;
    const impactLabel = impactValue >= 0.5
      ? `${isPositive ? '+' : '-'}$${formatMoney(impactValue)} trend ${isPositive ? 'boost' : 'drag'}`
      : `${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts`;
    if (highlightHot) {
      highlightHot.textContent = `${topImpact.definition?.name || 'Untitled niche'} • ${impactLabel}`;
    }
    if (highlightHotNote) {
      if (topImpact.assetCount > 0) {
        const payoutText = `$${formatMoney(Math.max(0, topImpact.netEarnings))}`;
        highlightHotNote.textContent = `Your ${topImpact.assetCount} asset${topImpact.assetCount === 1 ? '' : 's'} made ${payoutText} today with ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts.`;
      } else {
        highlightHotNote.textContent = `Queue an asset to capture ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts from this niche.`;
      }
    }
  }

  if (!fastestMove || !Number.isFinite(Number(fastestMove.popularity?.delta))) {
    if (highlightSwing) highlightSwing.textContent = 'Awaiting data';
    if (highlightSwingNote) highlightSwingNote.textContent = 'Fresh deltas will appear after the first reroll.';
  } else {
    if (highlightSwing) {
      const deltaText = describeDelta(fastestMove.popularity);
      highlightSwing.textContent = `${fastestMove.definition?.name || 'Untitled niche'} • ${deltaText}`;
    }
    if (highlightSwingNote) {
      const score = clampScore(fastestMove.popularity?.score);
      const payoutText = formatPercent((Number(fastestMove.popularity?.multiplier) || 1) - 1);
      const scoreText = score !== null ? `score ${score}` : 'score pending';
      highlightSwingNote.textContent = `${payoutText} payouts • ${scoreText}.`;
    }
  }

  if (!biggestLoss) {
    if (highlightRisk) highlightRisk.textContent = 'All calm';
    if (highlightRiskNote) highlightRiskNote.textContent = 'We’ll flag niches that are cooling off fast.';
  } else {
    const lossValue = Math.abs(biggestLoss.trendImpact);
    if (highlightRisk) {
      highlightRisk.textContent = `${biggestLoss.definition?.name || 'Untitled niche'} • -$${formatMoney(lossValue)} trend drag`;
    }
    if (highlightRiskNote) {
      if (biggestLoss.assetCount > 0) {
        highlightRiskNote.textContent = `${biggestLoss.assetCount} asset${biggestLoss.assetCount === 1 ? '' : 's'} lost ${formatPercent((Number(biggestLoss.popularity?.multiplier) || 1) - 1)} vs baseline today.`;
      } else {
        highlightRiskNote.textContent = 'No assets invested yet, so you are safe from this downswing.';
      }
    }
  }
}

function renderNicheWidget(state) {
  const refs = getNicheTrends() || {};
  const {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote,
    board
  } = refs;

  setupNicheControls();

  const analytics = buildNicheAnalytics(state);
  if (!analytics.length) {
    if (highlightHot) highlightHot.textContent = 'No readings yet';
    if (highlightHotNote) highlightHotNote.textContent = 'Assign a niche to start tracking buzz.';
    if (highlightSwing) highlightSwing.textContent = 'Awaiting data';
    if (highlightSwingNote) highlightSwingNote.textContent = 'Fresh deltas will appear after the first reroll.';
    if (highlightRisk) highlightRisk.textContent = 'All calm';
    if (highlightRiskNote) highlightRiskNote.textContent = 'We’ll flag niches that are cooling off fast.';
    if (board) {
      board.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      empty.textContent = 'Assign a niche to an asset to start tracking demand swings.';
      board.appendChild(empty);
    }
    updateNicheControlStates({ watchlistCount: 0 });
    return;
  }

  const watchlistCount = analytics.filter(entry => entry.watchlisted).length;
  updateNicheControlStates({ watchlistCount });

  updateDailyHighlights(analytics, {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote
  });

  let entries = analytics.slice();
  if (nicheViewState.watchlistOnly) {
    entries = entries.filter(entry => entry.watchlisted);
  }
  if (nicheViewState.investedOnly) {
    entries = entries.filter(entry => entry.assetCount > 0);
  }

  const sorters = {
    impact: (a, b) => {
      const impactDiff = Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
      if (impactDiff !== 0) return impactDiff;
      const assetDiff = b.assetCount - a.assetCount;
      if (assetDiff !== 0) return assetDiff;
      return (clampScore(b.popularity?.score) || 0) - (clampScore(a.popularity?.score) || 0);
    },
    assets: (a, b) => {
      const assetDiff = b.assetCount - a.assetCount;
      if (assetDiff !== 0) return assetDiff;
      const impactDiff = Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
      if (impactDiff !== 0) return impactDiff;
      return (clampScore(b.popularity?.score) || 0) - (clampScore(a.popularity?.score) || 0);
    },
    movement: (a, b) => {
      const deltaA = Math.abs(Number(a.popularity?.delta) || 0);
      const deltaB = Math.abs(Number(b.popularity?.delta) || 0);
      if (deltaB !== deltaA) return deltaB - deltaA;
      return Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
    }
  };

  const sorter = sorters[nicheViewState.sort] || sorters.impact;
  entries.sort(sorter);

  if (board) {
    board.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      if (nicheViewState.watchlistOnly) {
        empty.textContent = 'No watchlisted niches match the current filters.';
      } else if (nicheViewState.investedOnly) {
        empty.textContent = 'You haven’t assigned any assets that fit this filter yet.';
      } else {
        empty.textContent = 'Assign a niche to an asset to start tracking demand swings.';
      }
      board.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => {
        const card = createNicheCard(entry);
        if (card) fragment.appendChild(card);
      });
      board.appendChild(fragment);
    }
  }
}

export function renderDashboard(summary) {
  const state = getState();
  if (!state) return;

  const hoursLeft = Math.max(0, Number(state.timeLeft) || 0);
  const sessionStatus = getSessionStatusNode();
  setText(
    sessionStatus,
    `Day ${state.day} • ${formatHours(hoursLeft)} remaining`
  );

  setText(getMoneyNode(), `$${formatMoney(state.money)}`);

  const headerStats = getHeaderStats() || {};
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

  const kpiValues = getKpiValues() || {};
  const kpiNotes = getKpiNotes() || {};

  const net = summary.totalEarnings - summary.totalSpend;
  setText(kpiValues.net, `$${formatMoney(net)}`);
  setText(kpiNotes.net, `${formatMoney(summary.totalEarnings)} earned • ${formatMoney(summary.totalSpend)} spent`);

  setText(kpiValues.hours, `${formatHours(hoursLeft)}`);
  setText(kpiNotes.hours, hoursLeft > 0 ? 'Plenty of hustle hours left.' : 'Day is tapped out.');

  const { activeAssets, upkeepDue } = computeAssetMetrics(state);
  setText(kpiValues.upkeep, `$${formatMoney(upkeepDue)}`);
  setText(kpiNotes.upkeep, upkeepDue > 0 ? 'Maintain assets soon.' : 'Upkeep funded.');

  setText(kpiValues.assets, String(activeAssets));
  setText(kpiNotes.assets, activeAssets > 0 ? 'Streams humming.' : 'Launch your first asset.');

  const { percent, summary: studySummary } = computeStudyProgress(state);
  setText(kpiValues.study, `${percent}%`);
  setText(kpiNotes.study, studySummary);

  renderQueue(summary);
  renderQuickActions(state);
  renderAssetUpgradeActions(state);
  renderNotifications(state);
  renderEventPreview(state);
  renderNicheWidget(state);
  renderDailyStats(summary);
}
