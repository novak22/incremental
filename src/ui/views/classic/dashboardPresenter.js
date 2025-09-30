import {
  getAssetGallery,
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
  getSessionStatusNode
} from '../../elements/registry.js';
import setText from '../../dom.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { activateShellPanel } from '../../layout.js';
import { setNicheWatchlist } from '../../../game/assets/niches.js';

function createDailyListItem(entry) {
  if (!entry) return null;
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
    if (item) {
      container.appendChild(item);
    }
  });
}

function renderQueue(items) {
  const container = getQueueNodes()?.actionQueue;
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(items) ? items : [];
  list.forEach(item => {
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
  });
}

function renderQuickActions(actions) {
  const container = getQuickActionsContainer();
  const entries = actions.map(action => ({
    title: action.label,
    subtitle: action.description,
    buttonLabel: action.primaryLabel,
    onClick: action.onClick
  }));

  renderActionSection(container, entries, {
    emptyMessage: 'No ready actions. Check upgrades or ventures.',
    buttonClass: 'primary',
    defaultLabel: 'Queue'
  });
}

function renderAssetUpgradeActions(actions) {
  const container = getAssetUpgradeActionsContainer();
  const entries = actions.map(action => ({
    title: action.title,
    subtitle: action.subtitle,
    meta: action.meta,
    metaClass: action.metaClass,
    buttonLabel: action.buttonLabel,
    onClick: action.onClick
  }));

  renderActionSection(container, entries, {
    emptyMessage: 'Every venture is humming along. Check back after today’s upkeep.',
    buttonClass: 'secondary',
    defaultLabel: 'Boost'
  });
}

function renderNotifications(notifications) {
  const container = getNotificationsContainer();
  if (!container) return;
  container.innerHTML = '';
  const entries = Array.isArray(notifications) ? notifications : [];
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
    if (entry.targetPanel) {
      button.addEventListener('click', () => activateShellPanel(entry.targetPanel));
    }
    item.append(info, button);
    container.appendChild(item);
  });
}

function renderEventPreview(entries) {
  const container = getEventLogPreviewNode();
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!list.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Log is quiet. Run a hustle or buy an upgrade.';
    container.appendChild(empty);
    return;
  }

  list.forEach(entry => {
    const block = document.createElement('article');
    block.className = 'event-preview__item';
    const time = document.createElement('span');
    time.className = 'event-preview__time';
    const timestamp = Number(entry.timestamp);
    if (Number.isFinite(timestamp)) {
      time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      time.textContent = '--:--';
    }
    const message = document.createElement('p');
    message.className = 'event-preview__message';
    message.textContent = entry.message || '';
    block.append(time, message);
    container.appendChild(block);
  });
}

function renderDailyStats(stats) {
  if (!stats) return;
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

  setText(timeSummary, stats.time?.summary || '');
  renderDailyList(timeList, stats.time?.entries, stats.time?.emptyMessage, stats.time?.limit);

  const earnings = stats.earnings || {};
  setText(earningsSummary, earnings.summary || '');
  renderDailyList(earningsActive, earnings.active?.entries, earnings.active?.emptyMessage, earnings.active?.limit);
  renderDailyList(earningsPassive, earnings.passive?.entries, earnings.passive?.emptyMessage, earnings.passive?.limit);

  const spend = stats.spend || {};
  setText(spendSummary, spend.summary || '');
  renderDailyList(spendList, spend.entries, spend.emptyMessage, spend.limit);

  const study = stats.study || {};
  setText(studySummary, study.summary || '');
  renderDailyList(studyList, study.entries, study.emptyMessage, study.limit);
}

const nicheViewState = {
  sort: 'impact',
  investedOnly: false,
  watchlistOnly: false
};
let nicheControlsBound = false;
let assetHighlightTimer = null;
let latestModel = null;

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function focusAssetsForNiche(nicheId, { hasAssets = false, nicheName = '' } = {}) {
  if (!nicheId) return;
  activateShellPanel('panel-ventures');
  const assetGallery = getAssetGallery();
  const sessionStatus = getSessionStatusNode();
  if (!assetGallery) return;
  window.requestAnimationFrame(() => {
    const cards = Array.from(assetGallery.querySelectorAll('[data-asset]'));
    const matches = cards.filter(card => card.dataset.niche === nicheId);
    cards.forEach(card => card.classList.remove('asset-overview-card--spotlight'));
    if (!matches.length) {
      if (sessionStatus) {
        sessionStatus.textContent = hasAssets
          ? 'No payouts recorded yet. Fund upkeep to roll today’s earnings.'
          : 'No ventures targeting this niche yet. Open a venture card to assign one.';
      }
      return;
    }
    if (sessionStatus) {
      const label = nicheName || 'this niche';
      sessionStatus.textContent = `Spotlighting ventures tuned to ${label}.`;
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
  const normalizedScore = clampScore(entry.score ?? entry.popularity?.score);
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

  const globalStat = document.createElement('p');
  globalStat.className = 'niche-card__stat';
  globalStat.textContent = entry.multiplierLabel || 'Payout data pending';
  globalSection.appendChild(globalStat);

  const globalNote = document.createElement('p');
  globalNote.className = 'niche-card__note';
  const noteParts = [];
  if (normalizedScore !== null) noteParts.push(`Score ${normalizedScore}`);
  if (entry.deltaLabel) noteParts.push(entry.deltaLabel);
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
      ? '1 venture active'
      : `${entry.assetCount} ventures active`;
  } else if (entry.watchlisted) {
    playerStat.textContent = 'On your watchlist';
  } else {
    playerStat.textContent = 'No ventures assigned yet';
  }
  playerSection.appendChild(playerStat);

  const earningsLine = document.createElement('p');
  earningsLine.className = 'niche-card__metric';
  if (entry.assetCount > 0) {
    earningsLine.textContent = entry.netEarnings > 0
      ? `$${formatMoney(entry.netEarnings)} earned today`
      : 'No payouts logged today.';
  } else {
    earningsLine.textContent = 'Assign a venture to tap this trend.';
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
    ? 'View ventures in this niche'
    : 'Find ventures for this niche';
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

  card.appendChild(actions);

  return card;
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

function renderNicheWidget(model) {
  const refs = getNicheTrends() || {};
  const board = refs.board;
  const header = refs.header;
  const entries = Array.isArray(model?.niches) ? [...model.niches] : [];
  const watchlistCount = entries.filter(entry => entry.watchlisted).length;
  updateNicheControlStates({ watchlistCount });

  if (!header?.dataset.bound) {
    header?.addEventListener('click', () => {
      nicheViewState.watchlistOnly = false;
      nicheViewState.investedOnly = false;
      nicheViewState.sort = 'impact';
      renderNicheWidget(latestModel);
    });
    if (header) {
      header.dataset.bound = 'true';
    }
  }

  if (!entries.length) {
    if (board) {
      board.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      empty.textContent = 'Assign a niche to a venture to start tracking demand swings.';
      board.appendChild(empty);
    }
    return;
  }

  const filters = entries.filter(entry => {
    if (nicheViewState.investedOnly && entry.assetCount === 0) return false;
    if (nicheViewState.watchlistOnly && !entry.watchlisted) return false;
    return true;
  });

  const sorters = {
    impact: (a, b) => {
      const impactA = Math.abs(a.trendImpact) || 0;
      const impactB = Math.abs(b.trendImpact) || 0;
      if (impactB !== impactA) return impactB - impactA;
      return (b.netEarnings || 0) - (a.netEarnings || 0);
    },
    score: (a, b) => {
      const scoreA = clampScore(a.score ?? a.popularity?.score) || 0;
      const scoreB = clampScore(b.score ?? b.popularity?.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.netEarnings || 0) - (a.netEarnings || 0);
    },
    movement: (a, b) => {
      const deltaA = Math.abs(Number(a.popularity?.delta) || 0);
      const deltaB = Math.abs(Number(b.popularity?.delta) || 0);
      if (deltaB !== deltaA) return deltaB - deltaA;
      return Math.abs(b.trendImpact || 0) - Math.abs(a.trendImpact || 0);
    }
  };

  const sorter = sorters[nicheViewState.sort] || sorters.impact;
  filters.sort(sorter);

  if (board) {
    board.innerHTML = '';
    if (!filters.length) {
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      if (nicheViewState.watchlistOnly) {
        empty.textContent = 'No watchlisted niches match the current filters.';
      } else if (nicheViewState.investedOnly) {
        empty.textContent = 'You haven’t assigned any assets that fit this filter yet.';
      } else {
        empty.textContent = 'Assign a niche to a venture to start tracking demand swings.';
      }
      board.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      filters.forEach(entry => {
        const card = createNicheCard(entry);
        if (card) fragment.appendChild(card);
      });
      board.appendChild(fragment);
    }
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
      renderNicheWidget(latestModel);
    });
  });
  refs.filterInvested?.addEventListener('change', event => {
    nicheViewState.investedOnly = Boolean(event.target?.checked);
    renderNicheWidget(latestModel);
  });
  refs.filterWatchlist?.addEventListener('change', event => {
    nicheViewState.watchlistOnly = Boolean(event.target?.checked);
    renderNicheWidget(latestModel);
  });
  nicheControlsBound = true;
}

const dashboardPresenter = {
  renderDashboard(model) {
    if (!model) return;
    latestModel = model;

    const sessionStatus = getSessionStatusNode();
    setText(sessionStatus, model.session?.statusText || '');
    setText(getMoneyNode(), model.session?.moneyText || '$0');

    const headerStats = getHeaderStats() || {};
    const metrics = model.headerMetrics || {};
    setText(headerStats.dailyPlus?.value, metrics.dailyPlus?.value || '$0');
    setText(headerStats.dailyPlus?.note, metrics.dailyPlus?.note || '');
    setText(headerStats.dailyMinus?.value, metrics.dailyMinus?.value || '$0');
    setText(headerStats.dailyMinus?.note, metrics.dailyMinus?.note || '');
    setText(headerStats.timeAvailable?.value, metrics.timeAvailable?.value || '0h');
    setText(headerStats.timeAvailable?.note, metrics.timeAvailable?.note || '');
    setText(headerStats.timeReserved?.value, metrics.timeReserved?.value || '0h');
    setText(headerStats.timeReserved?.note, metrics.timeReserved?.note || '');

    const kpiValues = getKpiValues() || {};
    const kpiNotes = getKpiNotes() || {};
    const kpis = model.kpis || {};
    setText(kpiValues.net, kpis.net?.value || '$0');
    setText(kpiNotes.net, kpis.net?.note || '');
    setText(kpiValues.hours, kpis.hours?.value || '0h');
    setText(kpiNotes.hours, kpis.hours?.note || '');
    setText(kpiValues.upkeep, kpis.upkeep?.value || '$0');
    setText(kpiNotes.upkeep, kpis.upkeep?.note || '');
    setText(kpiValues.ventures, kpis.ventures?.value || '0');
    setText(kpiNotes.ventures, kpis.ventures?.note || '');
    setText(kpiValues.study, kpis.study?.value || '0%');
    setText(kpiNotes.study, kpis.study?.note || '');

    renderQueue(model.queue);
    renderQuickActions(Array.isArray(model.quickActions) ? model.quickActions : []);
    renderAssetUpgradeActions(Array.isArray(model.assetUpgrades) ? model.assetUpgrades : []);
    renderNotifications(model.notifications);
    renderEventPreview(model.eventLog);
    renderDailyStats(model.dailyStats);

    setupNicheControls();
    renderNicheWidget(model);
  }
};

export default dashboardPresenter;
