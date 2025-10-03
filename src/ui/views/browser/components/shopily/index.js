import { ensureArray, formatHours } from '../../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../../utils/lifecycleSummaries.js';
import { createTabbedWorkspacePresenter } from '../../utils/createTabbedWorkspacePresenter.js';
import { createNavTabs } from '../common/navBuilders.js';
import { renderWorkspaceLock } from '../common/renderWorkspaceLock.js';
import { selectShopilyNiche } from '../../../../cards/model/index.js';
import { performQualityAction } from '../../../../../game/assets/index.js';
import { getAssetState, getState, getUpgradeState } from '../../../../../core/state.js';
import { getAssetDefinition, getUpgradeDefinition } from '../../../../../core/state/registry.js';
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

const UPGRADE_STATUS_TONES = {
  owned: 'owned',
  ready: 'ready',
  unaffordable: 'unaffordable',
  locked: 'locked'
};

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

function formatKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

function formatSlotMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

function describeUpgradeSnapshotTone(snapshot = {}) {
  if (snapshot.purchased) return UPGRADE_STATUS_TONES.owned;
  if (snapshot.ready) return UPGRADE_STATUS_TONES.ready;
  if (!snapshot.affordable) return UPGRADE_STATUS_TONES.unaffordable;
  return UPGRADE_STATUS_TONES.locked;
}

function describeUpgradeAffordability(upgrade) {
  const snapshot = upgrade?.snapshot || {};
  if (snapshot.purchased) return 'Already installed and humming.';
  if (snapshot.ready) return 'You can fund this upgrade right now.';
  if (!snapshot.affordable) {
    const state = getState();
    const balance = Number(state?.money) || 0;
    const deficit = Math.max(0, Number(upgrade?.cost || 0) - balance);
    if (deficit <= 0) {
      return 'Stack a little more cash to cover this upgrade.';
    }
    return `Need ${formatCurrency(deficit)} more to fund this upgrade.`;
  }
  if (snapshot.disabled) return 'Meet the prerequisites to unlock checkout.';
  return 'Progress the requirements to unlock this purchase.';
}

function isRequirementMet(requirement) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const assetState = getAssetState(requirement.id);
      const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
      if (requirement.active) {
        return instances.filter(instance => instance?.status === 'active').length >= Number(requirement.count || 1);
      }
      return instances.length >= Number(requirement.count || 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

function formatRequirementHtml(requirement) {
  if (!requirement) return 'Requires: <strong>Prerequisites</strong>';
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const definition = getUpgradeDefinition(requirement.id);
      const label = definition?.name || formatKeyLabel(requirement.id);
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || formatKeyLabel(requirement.id);
      const count = Number(requirement.count || 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

function getRequirementEntries(upgrade) {
  const requirements = ensureArray(upgrade?.definition?.requirements);
  return requirements.map(requirement => ({
    html: formatRequirementHtml(requirement),
    met: isRequirementMet(requirement)
  }));
}

function collectDetailStrings(definition) {
  const details = ensureArray(definition?.details);
  return details
    .map(detail => {
      if (typeof detail === 'function') {
        try {
          return detail(definition);
        } catch (error) {
          return '';
        }
      }
      return detail;
    })
    .filter(Boolean);
}

function describeEffectSummary(effects = {}, affects = {}) {
  const effectParts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality speed`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% upkeep speed`;
        break;
      default:
        label = `${effect}: ${numeric}`;
    }
    effectParts.push(label);
  });
  if (!effectParts.length) return '';
  const scope = [];
  const assetIds = ensureArray(affects.assets?.ids);
  if (assetIds.length) scope.push(`stores (${assetIds.join(', ')})`);
  const assetTags = ensureArray(affects.assets?.tags);
  if (assetTags.length) scope.push(`tags ${assetTags.join(', ')}`);
  return scope.length ? `${effectParts.join(' • ')} → ${scope.join(' & ')}` : effectParts.join(' • ');
}

function collectUpgradeHighlights(upgrade) {
  const highlights = [];
  const effectSummary = describeEffectSummary(upgrade?.effects || {}, upgrade?.affects || {});
  if (effectSummary) {
    highlights.push(effectSummary);
  }
  if (upgrade?.boosts) {
    highlights.push(upgrade.boosts);
  }
  if (upgrade?.definition?.unlocks) {
    highlights.push(`Unlocks ${upgrade.definition.unlocks}`);
  }
  const provides = formatSlotMap(upgrade?.definition?.provides);
  if (provides) {
    highlights.push(`Provides ${provides}`);
  }
  const consumes = formatSlotMap(upgrade?.definition?.consumes);
  if (consumes) {
    highlights.push(`Consumes ${consumes}`);
  }
  return highlights;
}

function createLaunchButton(launch) {
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

function renderTopBar(model, state, context = {}, dependencies = {}) {
  const { onViewChange = () => {}, createLaunch = createLaunchButton } = dependencies;

  const bar = document.createElement('header');
  bar.className = 'shopily-topbar';

  const title = document.createElement('div');
  title.className = 'shopily-topbar__title';
  const heading = document.createElement('h1');
  const pageMeta = context?.page || {};
  heading.textContent = pageMeta?.headline || 'Shopily Commerce Deck';
  const note = document.createElement('p');
  note.textContent = pageMeta?.tagline || 'Launch, nurture, and upgrade every store from one clean dashboard.';
  title.append(heading, note);

  const activeCount = model.summary?.active || 0;
  const readyUpgrades = ensureArray(model.upgrades).filter(entry => entry?.snapshot?.ready).length;
  const nav = createNavTabs({
    navClassName: 'shopily-nav',
    buttonClassName: 'shopily-nav__button',
    badgeClassName: 'shopily-nav__badge',
    datasetKey: 'view',
    withAriaPressed: true,
    onSelect: (view, options) => onViewChange(view, options),
    buttons: [
      {
        label: 'My Stores',
        view: VIEW_DASHBOARD,
        badge: activeCount || null,
        isActive: state?.view === VIEW_DASHBOARD
      },
      {
        label: 'Upgrades',
        view: VIEW_UPGRADES,
        badge: readyUpgrades || null,
        isActive: state?.view === VIEW_UPGRADES
      },
      {
        label: 'Shopily Pricing',
        view: VIEW_PRICING,
        isActive: state?.view === VIEW_PRICING
      }
    ]
  });

  const actions = document.createElement('div');
  actions.className = 'shopily-topbar__actions';
  actions.appendChild(createLaunch(model.launch));

  const topRow = document.createElement('div');
  topRow.className = 'shopily-topbar__row';
  topRow.append(title, actions);

  bar.append(topRow, nav);
  return bar;
}

function renderViews(model, state = initialState) {
  const formatters = {
    formatCurrency,
    formatSignedCurrency,
    formatPercent,
    formatHours
  };

  const selectors = {
    getSelectedStore,
    getSelectedUpgrade
  };

  const handlers = {
    onSelectStore: storeId => setView(VIEW_DASHBOARD, { storeId }),
    onShowUpgradesForStore: storeId => setView(VIEW_UPGRADES, { storeId }),
    onRunAction: handleQuickAction,
    onSelectNiche: handleNicheSelect,
    onSelectUpgrade: upgradeId => setView(VIEW_UPGRADES, { upgradeId })
  };

  switch (state.view) {
    case VIEW_UPGRADES:
      return renderUpgradesView({
        model,
        state,
        formatters,
        handlers: { onSelectUpgrade: handlers.onSelectUpgrade },
        selectors,
        describeSnapshotTone: describeUpgradeSnapshotTone,
        describeAffordability: describeUpgradeAffordability,
        collectHighlights: collectUpgradeHighlights,
        collectRequirementEntries: getRequirementEntries,
        collectDetailStrings
      });
    case VIEW_PRICING:
      return renderPricingView({
        model,
        formatters,
        describeSetup: describePlanSetupSummary,
        describeUpkeep: describePlanUpkeepSummary
      });
    case VIEW_DASHBOARD:
    default:
      return renderDashboardView({
        model,
        state,
        formatters,
        handlers,
        selectors,
        createLaunchButton
      });
  }
}

function syncNavigation({ mount, state }) {
  if (!mount) return;
  const buttons = mount.querySelectorAll('.shopily-nav__button');
  buttons.forEach(button => {
    const targetView = button.dataset.view;
    const isActive = targetView === state?.view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(Boolean(isActive)));
  });
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

const presenter = createTabbedWorkspacePresenter({
  className: 'shopily',
  state: { ...initialState },
  ensureSelection,
  derivePath,
  deriveSummary: deriveWorkspaceSummary,
  renderHeader: (model, state, context) =>
    renderTopBar(model, state, context, {
      onViewChange: view => setView(view),
      createLaunch: createLaunchButton
    }),
  renderViews,
  renderLocked: renderLockedWorkspace,
  syncNavigation,
  isLocked: model => !model?.definition
});

function setView(view, options = {}) {
  const model = presenter.getModel();
  presenter.updateState(state => reduceSetView(state, model, view, options));
  presenter.render(model);
}

function render(model = {}, context = {}) {
  return presenter.render(model, context);
}

export default {
  render
};

export { render };
