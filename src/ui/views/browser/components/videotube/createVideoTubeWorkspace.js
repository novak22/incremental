import { formatHours } from '../../../../../core/helpers.js';
import { performQualityAction } from '../../../../../game/assets/index.js';
import { setAssetInstanceName } from '../../../../../game/assets/actions.js';
import { selectVideoTubeNiche } from '../../../../cards/model/index.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent
} from '../../utils/formatting.js';
import { createAssetWorkspacePresenter } from '../../utils/createAssetWorkspace.js';
import { renderWorkspaceLock } from '../common/renderWorkspaceLock.js';
import { createVideoTubeHeader } from './header.js';
import { createDashboardView } from './views/dashboardView.js';
import { createDetailView } from './views/detailView.js';
import { createCreateView } from './views/createView.js';
import { createAnalyticsView } from './views/analyticsView.js';

const VIEW_DASHBOARD = 'dashboard';
const VIEW_DETAIL = 'detail';
const VIEW_CREATE = 'create';
const VIEW_ANALYTICS = 'analytics';

function derivePath(state = {}) {
  switch (state.view) {
    case VIEW_ANALYTICS:
      return 'analytics';
    case VIEW_DETAIL: {
      const videoId = state.selectedVideoId;
      return videoId ? `videos/${videoId}` : 'videos';
    }
    case VIEW_CREATE:
      return 'create';
    case VIEW_DASHBOARD:
    default:
      return 'dashboard';
  }
}

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatPercent = value =>
  baseFormatPercent(value, {
    clampMin: 0,
    clampMax: 1,
    signDisplay: 'never'
  });

function ensureSelectedVideo(state = {}, model = {}) {
  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) {
    state.selectedVideoId = null;
    if (state.view === VIEW_DETAIL) {
      state.view = VIEW_DASHBOARD;
    }
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === state.selectedVideoId);
  state.selectedVideoId = (target || active || fallback)?.id || fallback.id;
}

function renderLockedState(model = {}, mount) {
  if (!mount) return;
  mount.innerHTML = '';
  mount.appendChild(
    renderWorkspaceLock({
      theme: {
        container: 'videotube-view',
        locked: 'videotube-view--locked',
        message: 'videotube-empty',
        label: 'This workspace'
      },
      lock: model.lock,
      fallbackMessage: 'VideoTube unlocks once the Vlog blueprint is discovered.'
    })
  );
}

function deriveSummary(model = {}) {
  return model?.summary ?? {};
}

const buildHeader = createVideoTubeHeader();

let presenter;

function showVideoDetail(videoId) {
  if (!videoId || !presenter) return;
  presenter.updateState(state => ({ ...state, selectedVideoId: videoId }));
  presenter.setView(VIEW_DETAIL);
}

export function createVideoTubeWorkspace(overrides = {}) {
  const actions = {
    performQualityAction: overrides.performQualityAction ?? performQualityAction,
    setAssetInstanceName: overrides.setAssetInstanceName ?? setAssetInstanceName,
    selectVideoTubeNiche: overrides.selectVideoTubeNiche ?? selectVideoTubeNiche
  };

  const handleQuickAction = (instanceId, actionId) => {
    if (!instanceId || !actionId) return;
    actions.performQualityAction('vlog', instanceId, actionId);
  };

  const handleNicheSelect = (instanceId, value) => {
    if (!instanceId || value == null) return;
    actions.selectVideoTubeNiche('vlog', instanceId, value);
  };

  const handleRename = (instanceId, value) => {
    if (!instanceId) return;
    actions.setAssetInstanceName('vlog', instanceId, value || '');
  };

  const renderDashboardView = createDashboardView({
    formatCurrency,
    formatPercent,
    formatHours,
    onQuickAction: handleQuickAction,
    onSelectVideo: showVideoDetail
  });

  const renderDetailView = createDetailView({
    formatCurrency,
    formatHours,
    onQuickAction: handleQuickAction,
    onRename: handleRename,
    onNicheSelect: handleNicheSelect
  });

  const renderCreateView = createCreateView({
    formatCurrency,
    formatHours,
    onVideoCreated: showVideoDetail
  });

  const renderAnalyticsView = createAnalyticsView({ formatCurrency });

  presenter = createAssetWorkspacePresenter({
    className: 'videotube',
    defaultView: VIEW_DASHBOARD,
    state: { view: VIEW_DASHBOARD, selectedVideoId: null },
    ensureSelection: ensureSelectedVideo,
    deriveSummary,
    derivePath,
    renderLocked: renderLockedState,
    isLocked: model => !model?.definition,
    header(model, state, context) {
      return buildHeader(model, state, context);
    },
    views: [
      {
        id: VIEW_DASHBOARD,
        label: 'Dashboard',
        badge: ({ model }) => (model.summary?.active ? model.summary.active : null),
        render: context => renderDashboardView(context)
      },
      {
        id: VIEW_DETAIL,
        label: 'Video Details',
        badge: ({ state }) => (state.selectedVideoId ? 1 : null),
        render: context => renderDetailView(context)
      },
      {
        id: VIEW_CREATE,
        label: 'Create',
        hide: true,
        render: context => renderCreateView(context)
      },
      {
        id: VIEW_ANALYTICS,
        label: 'Channel Analytics',
        render: context => renderAnalyticsView(context)
      }
    ]
  });

  return presenter;
}

export default {
  createVideoTubeWorkspace
};
