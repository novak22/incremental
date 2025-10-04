import { ensureArray, formatHours } from '../../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../../utils/lifecycleSummaries.js';
import { createAssetWorkspacePresenter } from '../../utils/createAssetWorkspace.js';
import { renderWorkspaceLock } from '../common/renderWorkspaceLock.js';
import { selectShopilyNiche } from '../../../../cards/model/index.js';
import { performQualityAction } from '../../../../../game/assets/index.js';
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

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('dropshipping', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectShopilyNiche('dropshipping', instanceId, value);
}

function createLaunchButton(launch = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-button shopily-button--primary';
  button.textContent = launch?.label || 'Launch New Store';
  button.disabled = Boolean(launch?.disabled);
  const reasons = ensureArray(launch?.availability?.reasons).filter(Boolean);
  if (reasons.length) {
    button.title = reasons.join('\n');
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    launch?.onClick?.();
  });
  return button;
}

function createLaunchAction(launch = {}) {
  const reasons = ensureArray(launch?.availability?.reasons).filter(Boolean);
  return {
    label: launch?.label || 'Launch New Store',
    className: 'shopily-button shopily-button--primary',
    disabled: Boolean(launch?.disabled),
    ...(reasons.length ? { title: reasons.join('\n') } : {}),
    onClick: () => {
      if (launch?.disabled) return;
      launch?.onClick?.();
    }
  };
}

function renderLockedWorkspace(model = {}, mount) {
  if (!mount) return;
  mount.innerHTML = '';
  mount.appendChild(
    renderWorkspaceLock({
      theme: {
        container: 'shopily',
        locked: 'shopily--locked',
        message: 'shopily-empty',
        label: 'Shopily'
      },
      lock: model.lock,
      fallbackMessage: 'Shopily unlocks once the Dropshipping blueprint is discovered.'
    })
  );
}

function deriveWorkspaceSummary(model = {}) {
  const summary = typeof model?.summary === 'object' && model.summary ? { ...model.summary } : {};
  if (!summary.meta) {
    summary.meta = 'Launch your first store';
  }
  return summary;
}

function renderDashboardSection(context) {
  const { model, state, updateState } = context;
  const handlers = {
    onSelectStore: storeId => updateState(current => reduceSetView(current, model, VIEW_DASHBOARD, { storeId })),
    onShowUpgradesForStore: storeId => updateState(current => reduceSetView(current, model, VIEW_UPGRADES, { storeId })),
    onRunAction: handleQuickAction,
    onSelectNiche: handleNicheSelect
  };
  return renderDashboardView({
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
    createLaunchButton
  });
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

export function createShopilyWorkspacePresenter() {
  const presenter = createAssetWorkspacePresenter({
    className: 'shopily',
    defaultView: VIEW_DASHBOARD,
    state: { ...initialState },
    ensureSelection,
    deriveSummary: deriveWorkspaceSummary,
    derivePath,
    renderLocked: renderLockedWorkspace,
    isLocked: model => !model?.definition,
    header(model, _state, sharedContext) {
      const pageMeta = sharedContext.presenter?.getPage?.() || {};
      const launch = model.launch || {};
      const actions = launch ? [createLaunchAction(launch)] : [];
      return {
        title: pageMeta.headline || 'Shopily Commerce Deck',
        subtitle: pageMeta.tagline || 'Launch, nurture, and upgrade every store from one clean dashboard.',
        actions,
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
        nav: {
          theme: {
            nav: 'shopily-nav shopily-topbar__nav',
            button: 'shopily-nav__button',
            badge: 'shopily-nav__badge'
          }
        }
      };
    },
    views: [
      {
        id: VIEW_DASHBOARD,
        label: 'My Stores',
        badge: ({ model }) => model.summary?.active || null,
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
  });

  return presenter;
}

export default {
  createShopilyWorkspacePresenter
};
