import { formatHours } from '../../../../core/helpers.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import { setAssetInstanceName } from '../../../../game/assets/actions.js';
import { selectVideoTubeNiche } from '../../../cards/model/index.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent
} from '../utils/formatting.js';

const VIEW_DASHBOARD = 'dashboard';
const VIEW_DETAIL = 'detail';
const VIEW_CREATE = 'create';
const VIEW_ANALYTICS = 'analytics';

let currentState = {
  view: VIEW_DASHBOARD,
  selectedVideoId: null
};
let currentModel = {
  definition: null,
  instances: [],
  summary: {},
  stats: {},
  analytics: {},
  launch: null
};
let currentMount = null;
let currentPageMeta = null;

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatPercent = value =>
  baseFormatPercent(value, {
    clampMin: 0,
    clampMax: 1,
    signDisplay: 'never'
  });

function ensureSelectedVideo() {
  const instances = Array.isArray(currentModel.instances) ? currentModel.instances : [];
  if (!instances.length) {
    currentState.selectedVideoId = null;
    if (currentState.view === VIEW_DETAIL) {
      currentState.view = VIEW_DASHBOARD;
    }
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === currentState.selectedVideoId);
  currentState.selectedVideoId = (target || active || fallback)?.id || fallback.id;
}

function setView(view, options = {}) {
  const nextView = view || VIEW_DASHBOARD;
  if (nextView === VIEW_DETAIL && options.videoId) {
    currentState.selectedVideoId = options.videoId;
  }
  currentState.view = nextView;
  ensureSelectedVideo();
  render(currentModel, { mount: currentMount, page: currentPageMeta });
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('vlog', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectVideoTubeNiche('vlog', instanceId, value);
}

function handleRename(instanceId, value) {
  if (!instanceId) return;
  setAssetInstanceName('vlog', instanceId, value || '');
}

function createNavButton(label, view) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'videotube-tab';
  button.dataset.view = view;
  button.textContent = label;
  button.addEventListener('click', () => {
    setView(view);
  });
  return button;
}

function renderHeader(model) {
  const header = document.createElement('header');
  header.className = 'videotube__header';

  const title = document.createElement('div');
  title.className = 'videotube__title';
  const heading = document.createElement('h1');
  heading.textContent = 'VideoTube Studio';
  const note = document.createElement('p');
  note.textContent = 'Manage uploads, hype premieres, and celebrate every payout.';
  title.append(heading, note);

  const nav = document.createElement('nav');
  nav.className = 'videotube-tabs';
  nav.append(
    createNavButton('Dashboard', VIEW_DASHBOARD),
    createNavButton('Video Details', VIEW_DETAIL),
    createNavButton('Channel Analytics', VIEW_ANALYTICS)
  );

  const actions = document.createElement('div');
  actions.className = 'videotube__actions';
  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = 'videotube-button videotube-button--primary';
  launchButton.textContent = 'Create New Video';
  launchButton.addEventListener('click', () => setView(VIEW_CREATE));
  actions.appendChild(launchButton);

  const masthead = document.createElement('div');
  masthead.className = 'videotube__masthead';
  masthead.append(title, actions);

  header.append(masthead, nav);
  return header;
}

function renderStatsBar(model) {
  const stats = model.stats || {};
  const bar = document.createElement('div');
  bar.className = 'videotube-stats';

  const lifetime = document.createElement('article');
  lifetime.className = 'videotube-stats__card';
  lifetime.innerHTML = `<span>Total earned</span><strong>${formatCurrency(stats.lifetime)}</strong>`;

  const daily = document.createElement('article');
  daily.className = 'videotube-stats__card';
  daily.innerHTML = `<span>Daily payout</span><strong>${formatCurrency(stats.daily)}</strong>`;

  const active = document.createElement('article');
  active.className = 'videotube-stats__card';
  active.innerHTML = `<span>Active uploads</span><strong>${stats.active || 0}</strong>`;

  const momentum = document.createElement('article');
  momentum.className = 'videotube-stats__card';
  momentum.innerHTML = `<span>Milestone progress</span><strong>${formatPercent(stats.milestonePercent)}</strong>`;

  bar.append(lifetime, daily, active, momentum);
  return bar;
}

function renderQualityCell(video) {
  const wrapper = document.createElement('div');
  wrapper.className = 'videotube-quality';

  const level = document.createElement('span');
  level.className = 'videotube-quality__level';
  level.textContent = `Q${video.qualityLevel}`;

  const bar = document.createElement('div');
  bar.className = 'videotube-quality__bar';
  const fill = document.createElement('div');
  fill.className = 'videotube-quality__fill';
  fill.style.setProperty('--videotube-quality', String((video.milestone?.percent || 0) * 100));
  bar.appendChild(fill);

  const summary = document.createElement('span');
  summary.className = 'videotube-quality__summary';
  summary.textContent = video.milestone?.summary || 'No milestone data yet';

  wrapper.append(level, bar, summary);
  return wrapper;
}

function renderNicheBadge(video) {
  const badge = document.createElement('span');
  badge.className = 'videotube-niche';
  if (video.niche) {
    badge.textContent = video.niche.name;
    badge.dataset.tone = video.niche.label?.toLowerCase() || 'steady';
    if (video.niche.label) {
      badge.title = `${video.niche.label} • ${video.niche.summary}`;
    }
  } else {
    badge.textContent = 'No niche yet';
    badge.dataset.tone = 'idle';
  }
  return badge;
}

function renderDashboardTable(model) {
  const instances = Array.isArray(model.instances) ? model.instances : [];
  const table = document.createElement('table');
  table.className = 'videotube-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Video', 'Latest payout', 'Lifetime', 'Quality', 'Niche', 'Quick action'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(video => {
    const row = document.createElement('tr');
    row.dataset.videoId = video.id;
    if (video.id === currentState.selectedVideoId) {
      row.classList.add('is-selected');
    }

    row.addEventListener('click', () => {
      setView(VIEW_DETAIL, { videoId: video.id });
    });

    const nameCell = document.createElement('td');
    nameCell.className = 'videotube-table__cell--label';
    const name = document.createElement('strong');
    name.textContent = video.label;
    const status = document.createElement('span');
    status.className = 'videotube-status';
    status.textContent = video.status?.label || '';
    nameCell.append(name, status);

    const latestCell = document.createElement('td');
    latestCell.textContent = formatCurrency(video.latestPayout);

    const lifetimeCell = document.createElement('td');
    lifetimeCell.textContent = formatCurrency(video.lifetimeIncome);

    const qualityCell = document.createElement('td');
    qualityCell.appendChild(renderQualityCell(video));

    const nicheCell = document.createElement('td');
    nicheCell.appendChild(renderNicheBadge(video));

    const actionCell = document.createElement('td');
    actionCell.className = 'videotube-table__cell--actions';
    if (video.quickAction) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'videotube-button videotube-button--ghost';
      actionButton.textContent = video.quickAction.label;
      actionButton.disabled = !video.quickAction.available;
      actionButton.title = video.quickAction.available
        ? `${video.quickAction.effect} • ${formatHours(video.quickAction.time)} • ${formatCurrency(video.quickAction.cost)}`
        : video.quickAction.disabledReason || 'Locked';
      actionButton.addEventListener('click', event => {
        event.stopPropagation();
        if (actionButton.disabled) return;
        handleQuickAction(video.id, video.quickAction.id);
      });
      actionCell.appendChild(actionButton);
    } else {
      actionCell.textContent = 'No actions';
    }

    row.append(nameCell, latestCell, lifetimeCell, qualityCell, nicheCell, actionCell);
    tbody.appendChild(row);
  });

  if (!tbody.children.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'videotube-table__empty';
    cell.textContent = 'No videos yet. Launch your first upload to start cashing in.';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
  }

  table.appendChild(tbody);
  return table;
}

function renderDashboardView(model) {
  const container = document.createElement('section');
  container.className = 'videotube-view videotube-view--dashboard';
  container.appendChild(renderStatsBar(model));
  container.appendChild(renderDashboardTable(model));
  return container;
}

function renderNicheSection(video) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Niche focus';
  panel.appendChild(title);

  if (video.nicheLocked && video.niche) {
    const badge = renderNicheBadge(video);
    badge.classList.add('videotube-niche--large');
    panel.appendChild(badge);
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.niche.label || 'Steady'} demand • ${video.niche.summary}`;
    panel.appendChild(summary);
  } else {
    const description = document.createElement('p');
    description.className = 'videotube-panel__note';
    description.textContent = 'Lock a niche once to boost payouts. Choose wisely — it sticks after launch!';
    panel.appendChild(description);

    const field = document.createElement('label');
    field.className = 'videotube-field';
    field.textContent = 'Select niche';
    const select = document.createElement('select');
    select.className = 'videotube-select';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Pick a niche';
    select.appendChild(emptyOption);
    video.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} • ${option.label || ''}`.trim();
      opt.title = option.summary || '';
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) return;
      handleNicheSelect(video.id, select.value);
    });
    field.appendChild(select);
    panel.appendChild(field);
  }

  return panel;
}

function renderRenameForm(video) {
  const form = document.createElement('form');
  form.className = 'videotube-rename';
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    handleRename(video.id, input.value);
  });

  const label = document.createElement('label');
  label.textContent = 'Video title';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 60;
  input.className = 'videotube-input';
  input.placeholder = video.fallbackLabel;
  input.value = video.customName || '';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'videotube-button videotube-button--secondary';
  submit.textContent = 'Save title';

  form.append(label, input, submit);
  return form;
}

function renderVideoStats(video) {
  const stats = document.createElement('dl');
  stats.className = 'videotube-stats-grid';

  const entries = [
    { label: 'Latest payout', value: formatCurrency(video.latestPayout) },
    { label: 'Daily average', value: formatCurrency(video.averagePayout) },
    { label: 'Lifetime earned', value: formatCurrency(video.lifetimeIncome) },
    {
      label: 'ROI',
      value:
        typeof video.roi === 'number'
          ? `${video.roi >= 0 ? '+' : ''}${Math.round(video.roi * 100)}%`
          : 'N/A'
    }
  ];

  entries.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    stats.append(dt, dd);
  });

  return stats;
}

function renderQualityPanel(video) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Quality momentum';
  panel.appendChild(title);

  const level = document.createElement('p');
  level.className = 'videotube-panel__lead';
  level.textContent = `Quality ${video.qualityLevel} • ${video.qualityInfo?.name || 'Growing audience'}`;
  panel.appendChild(level);

  const progress = document.createElement('div');
  progress.className = 'videotube-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'videotube-progress__fill';
  progressFill.style.setProperty('--videotube-progress', String((video.milestone?.percent || 0) * 100));
  progress.appendChild(progressFill);
  panel.appendChild(progress);

  if (video.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.milestone.summary} • next: ${video.milestone?.nextLevel?.name || 'Maxed out'}`;
    panel.appendChild(summary);
  }

  if (video.milestone?.steps?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-list';
    video.milestone.steps.forEach(step => {
      const item = document.createElement('li');
      item.textContent = `${step.current}/${step.goal} ${step.label}`;
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  return panel;
}

function renderPayoutPanel(video) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Latest payout breakdown';
  panel.appendChild(title);

  if (!video.payoutBreakdown?.entries?.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No payout history yet — run a day to gather data.';
    panel.appendChild(empty);
    return panel;
  }

  const total = document.createElement('p');
  total.className = 'videotube-panel__lead';
  total.textContent = `Total ${formatCurrency(video.payoutBreakdown.total)}`;
  panel.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'videotube-list videotube-list--payout';
  video.payoutBreakdown.entries.forEach(entry => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.textContent = `${entry.percent ? `${Math.round(entry.percent * 100)}% • ` : ''}${formatCurrency(entry.amount)}`;
    item.append(label, value);
    list.appendChild(item);
  });
  panel.appendChild(list);

  return panel;
}

function renderActionsPanel(video) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Quality actions';
  panel.appendChild(title);

  if (!Array.isArray(video.actions) || !video.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No actions unlocked yet. Discover upgrades to expand your toolkit.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'videotube-action-list';

  video.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'videotube-action';

    const label = document.createElement('div');
    label.className = 'videotube-action__label';
    label.textContent = action.label;

    const meta = document.createElement('div');
    meta.className = 'videotube-action__meta';
    const costParts = [
      action.time > 0 ? `${formatHours(action.time)}` : 'Instant',
      action.cost > 0 ? formatCurrency(action.cost) : 'Free'
    ];
    meta.textContent = `${action.effect} • ${costParts.join(' • ')}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'videotube-button videotube-button--primary';
    button.textContent = 'Run action';
    button.disabled = !action.available;
    button.title = action.available ? '' : action.disabledReason || 'Unavailable';
    button.addEventListener('click', () => {
      if (button.disabled) return;
      handleQuickAction(video.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

function renderDetailView(model) {
  const container = document.createElement('section');
  container.className = 'videotube-view videotube-view--detail';

  const instances = Array.isArray(model.instances) ? model.instances : [];
  const video = instances.find(entry => entry.id === currentState.selectedVideoId);
  if (!video) {
    const empty = document.createElement('p');
    empty.className = 'videotube-empty';
    empty.textContent = 'Select a video from the dashboard to inspect analytics.';
    container.appendChild(empty);
    return container;
  }

  const header = document.createElement('div');
  header.className = 'videotube-detail__header';
  const title = document.createElement('h2');
  title.textContent = video.label;
  header.appendChild(title);
  header.appendChild(renderRenameForm(video));
  container.appendChild(header);

  container.appendChild(renderVideoStats(video));

  const grid = document.createElement('div');
  grid.className = 'videotube-detail-grid';
  grid.append(
    renderQualityPanel(video),
    renderPayoutPanel(video),
    renderActionsPanel(video),
    renderNicheSection(video)
  );
  container.appendChild(grid);

  return container;
}

function renderCreateView(model) {
  const container = document.createElement('section');
  container.className = 'videotube-view videotube-view--create';

  const card = document.createElement('article');
  card.className = 'videotube-create';

  const title = document.createElement('h2');
  title.textContent = 'Spin up a new video';
  card.appendChild(title);

  const launch = model.launch || {};
  const setup = launch.setup || {};
  const maintenance = launch.maintenance || {};

  const summary = document.createElement('p');
  summary.className = 'videotube-panel__note';
  summary.textContent = `${setup.days || 0} day launch • ${formatHours(setup.hoursPerDay || 0)} each day • ${formatCurrency(setup.cost || 0)} upfront.`;
  card.appendChild(summary);

  const upkeep = document.createElement('p');
  upkeep.className = 'videotube-panel__note';
  upkeep.textContent = `Upkeep: ${formatHours(maintenance.hours || 0)} • ${formatCurrency(maintenance.cost || 0)} daily`;
  card.appendChild(upkeep);

  const form = document.createElement('form');
  form.className = 'videotube-create__form';
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!launch.create) return;
    const nameInput = form.querySelector('[name="video-name"]');
    const nicheInput = form.querySelector('[name="video-niche"]');
    const newId = launch.create({
      name: nameInput.value || launch.defaultName,
      nicheId: nicheInput.value || null
    });
    if (newId) {
      currentState.selectedVideoId = newId;
      setView(VIEW_DETAIL, { videoId: newId });
    }
  });

  const nameField = document.createElement('label');
  nameField.className = 'videotube-field';
  nameField.textContent = 'Video title';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'video-name';
  nameInput.maxLength = 60;
  nameInput.className = 'videotube-input';
  nameInput.value = launch.defaultName || '';
  nameField.appendChild(nameInput);
  form.appendChild(nameField);

  const nicheField = document.createElement('label');
  nicheField.className = 'videotube-field';
  nicheField.textContent = 'Pick a niche';
  const nicheSelect = document.createElement('select');
  nicheSelect.name = 'video-niche';
  nicheSelect.className = 'videotube-select';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'No niche yet';
  nicheSelect.appendChild(blank);
  (launch.nicheOptions || []).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} • ${option.label || ''}`.trim();
    nicheSelect.appendChild(opt);
  });
  nicheField.appendChild(nicheSelect);
  form.appendChild(nicheField);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'videotube-button videotube-button--primary';
  submit.textContent = launch.label || 'Launch video';
  submit.disabled = launch.disabled || launch.availability?.disabled;
  form.appendChild(submit);

  if (launch.availability?.reasons?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-requirements';
    launch.availability.reasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  card.appendChild(form);

  const hint = document.createElement('p');
  hint.className = 'videotube-panel__hint';
  hint.textContent = 'Costs pull instantly. Niche locks after launch, so preview heat before committing!';
  card.appendChild(hint);

  container.appendChild(card);
  return container;
}

function renderAnalyticsView(model) {
  const container = document.createElement('section');
  container.className = 'videotube-view videotube-view--analytics';

  const analytics = model.analytics || { videos: [], niches: [] };

  const grid = document.createElement('div');
  grid.className = 'videotube-analytics';

  const videoCard = document.createElement('article');
  videoCard.className = 'videotube-panel';
  const videoTitle = document.createElement('h3');
  videoTitle.textContent = 'Top earners';
  videoCard.appendChild(videoTitle);
  if (analytics.videos?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-list';
    analytics.videos.slice(0, 5).forEach(entry => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${entry.label}</strong><span>${formatCurrency(entry.lifetime)} lifetime • ${formatCurrency(entry.latest)} daily</span>`;
      list.appendChild(item);
    });
    videoCard.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No earning history yet. Launch a video to start tracking analytics.';
    videoCard.appendChild(empty);
  }

  const nicheCard = document.createElement('article');
  nicheCard.className = 'videotube-panel';
  const nicheTitle = document.createElement('h3');
  nicheTitle.textContent = 'Niche breakdown';
  nicheCard.appendChild(nicheTitle);
  if (analytics.niches?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-list';
    analytics.niches.slice(0, 5).forEach(entry => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${entry.niche}</strong><span>${formatCurrency(entry.lifetime)} lifetime • ${formatCurrency(entry.daily)} daily</span>`;
      list.appendChild(item);
    });
    nicheCard.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No niche data yet. Assign niches to start ranking performance.';
    nicheCard.appendChild(empty);
  }

  grid.append(videoCard, nicheCard);
  container.appendChild(grid);
  return container;
}

function renderLockedState(lock) {
  const container = document.createElement('section');
  container.className = 'videotube-view videotube-view--locked';
  const message = document.createElement('p');
  message.className = 'videotube-empty';
  if (lock?.type === 'skill') {
    const courseNote = lock.courseName ? ` Complete ${lock.courseName} in Learnly to level up instantly.` : '';
    message.textContent = `${lock.workspaceLabel || 'This workspace'} unlocks at ${lock.skillName} Lv ${lock.requiredLevel}.${courseNote}`;
  } else {
    message.textContent = 'VideoTube unlocks once the Vlog blueprint is discovered.';
  }
  container.appendChild(message);
  return container;
}

function renderCurrentView(model) {
  switch (currentState.view) {
    case VIEW_DETAIL:
      return renderDetailView(model);
    case VIEW_CREATE:
      return renderCreateView(model);
    case VIEW_ANALYTICS:
      return renderAnalyticsView(model);
    case VIEW_DASHBOARD:
    default:
      return renderDashboardView(model);
  }
}

function updateActiveTab(root) {
  const tabs = root.querySelectorAll('.videotube-tab');
  tabs.forEach(tab => {
    if (tab.dataset.view === currentState.view) {
      tab.classList.add('is-active');
    } else {
      tab.classList.remove('is-active');
    }
  });
}

export function render(model = {}, context = {}) {
  currentModel = model || {};
  if (context.mount) {
    currentMount = context.mount;
  }
  if (context.page) {
    currentPageMeta = context.page;
  }
  if (!currentMount) {
    return currentModel.summary || {};
  }

  if (!currentModel.definition) {
    currentMount.innerHTML = '';
    currentMount.appendChild(renderLockedState(currentModel.lock));
    return currentModel.summary || {};
  }

  ensureSelectedVideo();

  currentMount.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'videotube';
  root.appendChild(renderHeader(currentModel));
  const view = renderCurrentView(currentModel);
  root.appendChild(view);
  currentMount.appendChild(root);
  updateActiveTab(root);

  return currentModel.summary || {};
}

export default {
  render
};
