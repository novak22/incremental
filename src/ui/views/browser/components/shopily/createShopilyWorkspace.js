import { ensureArray, formatHours } from '../../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../../utils/lifecycleSummaries.js';
import {
  registerAssetWorkspace,
  createActionDelegates,
  createLaunchAction,
  createLaunchButton,
  withNavTheme
} from '../../utils/assetWorkspaceRegistry.js';
import { selectShopilyNiche } from '../../../../cards/model/index.js';
import {
  VIEW_DASHBOARD,
  VIEW_UPGRADES,
  VIEW_PRICING,
  initialState,
  ensureSelection,
  derivePath,
  reduceSetView,
  getSelectedStore,
  getSelectedUpgrade
} from './state.js';
import renderDashboardView from './views/dashboardView.js';
import renderUpgradesView from './views/upgradesView.js';
import renderPricingView from './views/pricingView.js';

const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatSignedCurrency = amount => baseFormatSignedCurrency(amount, { precision: 'cent' });
const formatPercent = value => baseFormatPercent(value, { nullFallback: '—', signDisplay: 'always' });

const {
  describeSetupSummary: describePlanSetupSummary,
  describeUpkeepSummary: describePlanUpkeepSummary
} = createCurrencyLifecycleSummary({
  formatCurrency,
  formatDailyHours: hours => `${formatHours(hours)} per day`,
  copy: {
    setupFallback: 'Instant setup',
    upkeepFallback: 'No upkeep'
  }
});

function deriveWorkspaceSummary(model = {}) {
  const summary = typeof model?.summary === 'object' && model.summary ? { ...model.summary } : {};
  if (!summary.meta) {
    summary.meta = 'Launch your first store';
  }
  return summary;
}

function renderDashboardSection(context) {
  const { model, state, updateState, helpers } = context;
  const delegates = createActionDelegates(helpers);
  const handlers = {
    onSelectStore: storeId => updateState(current => reduceSetView(current, model, VIEW_DASHBOARD, { storeId })),
    onShowUpgradesForStore: storeId => updateState(current => reduceSetView(current, model, VIEW_UPGRADES, { storeId })),
    onRunAction: delegates.runAction,
    onSelectNiche: delegates.selectNiche
  };
  const renderDashboard = renderDashboardView({
    model,
    state,
    formatters: {
      formatCurrency,
      formatSignedCurrency,
      formatPercent,
      formatHours
    },
    handlers,
    selectors: { getSelectedStore },
    createLaunchButton: launch =>
      createLaunchButton({
        launch,
        helpers,
        label: 'Launch New Store',
        className: 'shopily-button shopily-button--primary'
      })
  });
  return renderDashboard(context);
}

function renderUpgradesSection(context) {
  const { model, state, updateState } = context;
  const handlers = {
    onSelectUpgrade: upgradeId => updateState(current => reduceSetView(current, model, VIEW_UPGRADES, { upgradeId }))
  };
  return renderUpgradesView({
    model,
    state,
    formatters: {
      formatCurrency,
      formatPercent
    },
    handlers,
    selectors: { getSelectedUpgrade }
  });
}

function renderPricingSection(context) {
  const { model } = context;
  return renderPricingView({
    model,
    formatters: { formatCurrency },
    describeSetup: describePlanSetupSummary,
    describeUpkeep: describePlanUpkeepSummary
  });
}

const { createPresenter: createShopilyWorkspacePresenter } = registerAssetWorkspace({
    assetType: 'dropshipping',
    className: 'shopily',
    defaultView: VIEW_DASHBOARD,
    state: { ...initialState },
    ensureSelection,
    deriveSummary: deriveWorkspaceSummary,
    derivePath,
    lock: {
      theme: {
        container: 'shopily',
        locked: 'shopily--locked',
        message: 'shopily-empty',
        label: 'Shopily'
      },
      fallbackMessage: 'Shopily unlocks once the Dropshipping blueprint is discovered.'
    },
    actions: {
      selectNiche: selectShopilyNiche
    },
    header(model, _state, sharedContext) {
      const pageMeta = sharedContext.presenter?.getPage?.() || {};
      const launchAction = createLaunchAction({
        launch: model.launch,
        helpers: sharedContext.helpers,
        context: sharedContext,
        label: 'Launch New Store',
        className: 'shopily-button shopily-button--primary'
      });
      return {
        title: pageMeta.headline || 'Shopily Commerce Deck',
        subtitle: pageMeta.tagline || 'Launch, nurture, and upgrade every store from one clean dashboard.',
        actions: launchAction ? [launchAction] : [],
        theme: {
          header: 'shopily-topbar',
          intro: 'shopily-topbar__intro',
          title: 'shopily-topbar__heading',
          subtitle: 'shopily-topbar__tagline',
          actions: 'shopily-topbar__actions',
          actionButton: 'shopily-button shopily-button--primary',
          nav: 'shopily-nav shopily-topbar__nav',
          button: 'shopily-nav__button',
          badge: 'shopily-nav__badge'
        },
        nav: withNavTheme('shopily', {
          theme: {
            nav: 'shopily-nav shopily-topbar__nav',
            button: 'shopily-nav__button',
            badge: 'shopily-nav__badge'
          }
        })
      };
    },
    views: [
      {
        id: VIEW_DASHBOARD,
        label: 'My Stores',
        badge: { summary: 'active' },
        render: context => renderDashboardSection(context)
      },
      {
        id: VIEW_UPGRADES,
        label: 'Upgrades',
        badge: ({ model }) => {
          const ready = ensureArray(model.upgrades).filter(upgrade => upgrade?.snapshot?.ready).length;
          return ready || null;
        },
        render: context => renderUpgradesSection(context)
      },
      {
        id: VIEW_PRICING,
        label: 'Shopily Pricing',
        render: context => renderPricingSection(context)
      }
    ]
  }
);

export { createShopilyWorkspacePresenter };

export default {
  createShopilyWorkspacePresenter
};
