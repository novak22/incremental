import { ensureArray, formatHours } from '../../../../core/helpers.js';
import { selectServerHubNiche } from '../../../cards/model/index.js';
import {
  formatCurrency as baseFormatCurrency,
  formatNetCurrency as baseFormatNetCurrency,
  formatPercent as baseFormatPercent
} from '../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../utils/lifecycleSummaries.js';
import { showLaunchConfirmation } from '../utils/launchDialog.js';
import {
  registerAssetWorkspace,
  createActionDelegates,
  createLaunchAction,
  withNavTheme
} from '../utils/assetWorkspaceRegistry.js';
import { createWorkspaceLockRenderer } from './common/renderWorkspaceLock.js';
import { getWorkspaceLockTheme } from './common/workspaceLockThemes.js';
import { createAppsView } from './serverhub/views/appsView.js';
import { createUpgradesView } from './serverhub/views/upgradesView.js';
import { createPricingView } from './serverhub/views/pricingView.js';

const VIEW_APPS = 'apps';
const VIEW_UPGRADES = 'upgrades';
const VIEW_PRICING = 'pricing';

const {
  theme: SERVERHUB_LOCK_THEME,
  fallbackMessage: SERVERHUB_LOCK_FALLBACK_MESSAGE
} = getWorkspaceLockTheme('serverhub');

const renderLocked = createWorkspaceLockRenderer({
  theme: SERVERHUB_LOCK_THEME,
  fallbackMessage: SERVERHUB_LOCK_FALLBACK_MESSAGE
});

const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatNetCurrency = amount => baseFormatNetCurrency(amount, { precision: 'integer' });
const formatPercent = value => baseFormatPercent(value, { nullFallback: '—', signDisplay: 'always' });

const ACTION_CONSOLE_ORDER = [
  { id: 'shipFeature', label: 'Ship Feature' },
  { id: 'improveStability', label: 'Improve Stability' },
  { id: 'launchCampaign', label: 'Launch Campaign' },
  { id: 'deployEdgeNodes', label: 'Deploy Edge Nodes' }
];

const KPI_DESCRIPTORS = new Map([
  ['active', { formatter: 'activeCount' }],
  ['net', { formatter: 'netCurrency' }],
  ['default', { formatter: 'currency' }]
]);

const INSTANCE_TABLE_COLUMNS = [
  {
    id: 'name',
    label: 'App Name',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--name',
    cellClassName: 'serverhub-table__cell--name',
    renderer: 'name'
  },
  {
    id: 'status',
    label: 'Status',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--status',
    cellClassName: 'serverhub-table__cell--status',
    renderer: 'status'
  },
  {
    id: 'niche',
    label: 'Niche',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--niche',
    cellClassName: 'serverhub-table__cell--niche',
    renderer: 'niche'
  },
  {
    id: 'payout',
    label: 'Daily Earnings',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--payout',
    cellClassName: 'serverhub-table__cell--payout',
    renderer: 'payout'
  },
  {
    id: 'upkeep',
    label: 'Daily Upkeep',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--upkeep',
    cellClassName: 'serverhub-table__cell--upkeep',
    renderer: 'upkeep'
  },
  {
    id: 'roi',
    label: 'ROI %',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--roi',
    cellClassName: 'serverhub-table__cell--roi',
    renderer: 'roi'
  },
  {
    id: 'actions',
    label: 'Actions',
    headerClassName: 'serverhub-table__heading serverhub-table__heading--actions',
    cellClassName: 'serverhub-table__cell--actions',
    renderer: 'actions'
  }
];

const { describeSetupSummary: formatSetupSummary, describeUpkeepSummary: formatUpkeepSummary } =
  createCurrencyLifecycleSummary({
    formatCurrency,
    formatDailyHours: hours => `${formatHours(hours)} per day`,
    copy: {
      setupFallback: 'Instant setup'
    }
  });

function confirmLaunchWithDetails(definition = {}) {
  const resourceName = definition.singular || definition.name || 'app';
  const setupSummary = formatSetupSummary(definition.setup);
  const upkeepSummary = formatUpkeepSummary(definition.maintenance);
  return showLaunchConfirmation({
    theme: 'serverhub',
    icon: '🛰️',
    title: 'Deploy this app?',
    resourceName,
    tagline: 'Give your SaaS a smooth liftoff with a quick double-check.',
    setupSummary,
    upkeepSummary,
    confirmLabel: 'Deploy app',
    cancelLabel: 'Hold launch'
  });
}

function ensureSelection(state = {}, model = {}) {
  const instances = ensureArray(model.instances);
  if (!instances.length) {
    state.selectedAppId = null;
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === state.selectedAppId);
  state.selectedAppId = (target || active || fallback)?.id || instances[0].id;
}

function getSelectedApp(model = {}, state = {}) {
  const instances = ensureArray(model.instances);
  return instances.find(entry => entry.id === state.selectedAppId) || null;
}

function deriveSummary(model = {}) {
  const summary = model.summary;
  const isSummaryObject = summary && typeof summary === 'object' && !Array.isArray(summary);
  if (isSummaryObject) {
    const meta = summary.meta || 'Launch your first micro SaaS';
    return { ...summary, meta };
  }
  const meta = (typeof summary === 'string' && summary) || 'Launch your first micro SaaS';
  return { meta };
}

function derivePath(state = {}) {
  const view = state?.view;
  switch (view) {
    case VIEW_UPGRADES:
      return 'upgrades';
    case VIEW_PRICING:
      return 'pricing';
    case VIEW_APPS:
    default: {
      const appId = state?.selectedAppId;
      if (appId != null && appId !== '') {
        return `apps/${appId}`;
      }
      return 'apps';
    }
  }
}

let presenter;

const renderUpgradesView = createUpgradesView({ formatCurrency });
const renderPricingView = createPricingView({ formatCurrency, formatHours });

async function handleLaunch(context = {}) {
  if (!context) {
    return false;
  }

  if (typeof context.getModel === 'function') {
    const presenterInstance = context;
    const model = presenterInstance.getModel?.() || {};
    const launch = model.launch;
    if (!launch || launch.disabled) {
      return false;
    }
    const confirmed = await confirmLaunchWithDetails(model.definition);
    if (!confirmed) {
      return false;
    }
    if (typeof launch.onClick === 'function') {
      await launch.onClick();
    }
    return true;
  }

  const presenter = context.presenter;
  const model = context.model ?? presenter?.getModel?.() ?? {};
  const launch = context.launch ?? model.launch;

  if (!presenter || !model || !launch || launch.disabled) {
    return false;
  }

  const confirmed = await confirmLaunchWithDetails(model.definition);
  if (!confirmed) {
    return false;
  }

  if (typeof launch.onClick === 'function') {
    await launch.onClick(context.event);
  }

  return true;
}

const serverHubWorkspaceRegistration = registerAssetWorkspace({
  assetType: 'saas',
  className: 'serverhub',
  defaultView: VIEW_APPS,
  state: { view: VIEW_APPS, selectedAppId: null },
  ensureSelection,
  deriveSummary,
  derivePath,
  renderLocked,
  actions: {
    selectNiche: selectServerHubNiche,
    launch: handleLaunch
  },
  header(model, state, sharedContext) {
    const launchAction = createLaunchAction({
      launch: model.launch,
      helpers: sharedContext.helpers,
      context: sharedContext,
      label: '+ Deploy New App',
      className: 'serverhub-button serverhub-button--primary'
    });

    const setupCount = model.summary?.setup || 0;
    const meta = setupCount > 0
      ? `${setupCount} app${setupCount === 1 ? '' : 's'} finishing launch prep.`
      : null;

    return {
      className: 'serverhub-header',
      theme: {
        header: 'serverhub-header',
        intro: 'serverhub-header__intro',
        title: 'serverhub-header__title',
        subtitle: 'serverhub-header__subtitle',
        meta: 'serverhub-header__meta',
        actions: 'serverhub-header__actions',
        actionButton: 'serverhub-button',
        nav: 'serverhub-nav',
        button: 'serverhub-nav__button',
        badge: 'serverhub-nav__badge'
      },
      title: 'ServerHub Cloud Console',
      subtitle: 'Deploy SaaS apps, monitor uptime, and optimize ROI.',
      meta,
      actions: launchAction ? [launchAction] : [],
      nav: withNavTheme('serverhub', {
        theme: {
          nav: 'serverhub-nav',
          button: 'serverhub-nav__button',
          badge: 'serverhub-nav__badge'
        }
      })
    };
  },
  views: [
    {
      id: VIEW_APPS,
      label: 'My Apps',
      badge: ({ model }) => model.summary?.active || null,
      createView: helpers => {
        const delegates = createActionDelegates(helpers);
        return createAppsView({
          formatCurrency,
          formatNetCurrency,
          formatPercent,
          formatHours,
          kpiDescriptors: KPI_DESCRIPTORS,
          tableColumns: INSTANCE_TABLE_COLUMNS,
          actionConsoleOrder: ACTION_CONSOLE_ORDER,
          onQuickAction: delegates.quickAction,
          onNicheSelect: delegates.selectNiche,
          onLaunch: () => delegates.launch({ source: 'apps-view' }),
          getSelectedApp
        });
      }
    },
    {
      id: VIEW_UPGRADES,
      label: 'Upgrades',
      badge: ({ model }) => {
        const ready = ensureArray(model.upgrades).filter(upgrade => upgrade.snapshot?.ready).length;
        return ready || null;
      },
      render: context => renderUpgradesView(context)
    },
    {
      id: VIEW_PRICING,
      label: 'Pricing',
      render: context => renderPricingView(context)
    }
  ]
});

presenter = serverHubWorkspaceRegistration.createPresenter();

function render(model, context = {}) {
  const summary = presenter.render(model, context);
  const meta = summary?.meta || 'Launch your first micro SaaS';
  const urlPath = summary?.urlPath || '';
  return { meta, urlPath };
}

export default {
  render
};
