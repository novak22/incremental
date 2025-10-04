import { formatHours } from '../../../../../core/helpers.js';
import { performQualityAction } from '../../../../../game/assets/index.js';
import { setAssetInstanceName } from '../../../../../game/assets/actions.js';
import { selectVideoTubeNiche } from '../../../../cards/model/index.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent
} from '../../utils/formatting.js';
import { registerAssetWorkspace, createActionDelegates } from '../../utils/assetWorkspaceRegistry.js';
import { getWorkspaceLockTheme } from '../common/workspaceLockThemes.js';
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

function deriveSummary(model = {}) {
  return model?.summary ?? {};
}

const buildHeader = createVideoTubeHeader();

let presenter;
let renameAssetInstance = setAssetInstanceName;

const {
  theme: VIDEOTUBE_LOCK_THEME,
  fallbackMessage: VIDEOTUBE_LOCK_FALLBACK_MESSAGE
} = getWorkspaceLockTheme('videotube');

function showVideoDetail(videoId) {
  if (!videoId || !presenter) return;
  presenter.updateState(state => ({ ...state, selectedVideoId: videoId }));
  presenter.setView(VIEW_DETAIL);
}

function handleRename(instanceId, value) {
  if (!instanceId) return;
  renameAssetInstance('vlog', instanceId, value || '');
}

const videoTubeWorkspaceRegistration = registerAssetWorkspace({
  assetType: 'vlog',
  className: 'videotube',
  defaultView: VIEW_DASHBOARD,
  state: { view: VIEW_DASHBOARD, selectedVideoId: null },
  ensureSelection: ensureSelectedVideo,
  deriveSummary,
  derivePath,
  lock: {
    theme: VIDEOTUBE_LOCK_THEME,
    fallbackMessage: VIDEOTUBE_LOCK_FALLBACK_MESSAGE
  },
  actions: {
    performQualityAction,
    selectNiche: selectVideoTubeNiche
  },
  header(model, state, context) {
    return buildHeader(model, state, context);
  },
  views: [
    {
      id: VIEW_DASHBOARD,
      label: 'Dashboard',
      badge: { summary: 'active' },
      createView: helpers =>
        createDashboardView({
          formatCurrency,
          formatPercent,
          formatHours,
          onQuickAction: createActionDelegates(helpers).quickAction,
          onSelectVideo: showVideoDetail
        })
    },
    {
      id: VIEW_DETAIL,
      label: 'Video Details',
      badge: ({ state }) => (state.selectedVideoId ? 1 : null),
      createView: helpers =>
        createDetailView({
          formatCurrency,
          formatHours,
          onQuickAction: createActionDelegates(helpers).quickAction,
          onRename: handleRename,
          onNicheSelect: createActionDelegates(helpers).selectNiche
        })
    },
    {
      id: VIEW_CREATE,
      label: 'Create',
      hide: true,
      createView: () =>
        createCreateView({
          formatCurrency,
          formatHours,
          onVideoCreated: showVideoDetail
        })
    },
    {
      id: VIEW_ANALYTICS,
      label: 'Channel Analytics',
      createView: () => createAnalyticsView({ formatCurrency })
    }
  ]
});

export function createVideoTubeWorkspace(overrides = {}) {
  const actions = {
    performQualityAction: overrides.performQualityAction ?? performQualityAction,
    setAssetInstanceName: overrides.setAssetInstanceName ?? setAssetInstanceName,
    selectVideoTubeNiche: overrides.selectVideoTubeNiche ?? selectVideoTubeNiche
  };

  renameAssetInstance = actions.setAssetInstanceName;

  presenter = videoTubeWorkspaceRegistration.createPresenter({
    actions: {
      performQualityAction: actions.performQualityAction,
      selectNiche: actions.selectVideoTubeNiche
    }
  });

  return presenter;
}

export default {
  createVideoTubeWorkspace
};
