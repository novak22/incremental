import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import {
  getQuickActionIds as getDigishelfQuickActionIds,
  selectDigishelfNiche
} from '../../../../cards/model/digishelf.js';
import { performQualityAction } from '../../../../../game/assets/index.js';
import { formatCurrency as baseFormatCurrency } from '../../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../../utils/lifecycleSummaries.js';
import { showLaunchConfirmation } from '../../utils/launchDialog.js';
import { createTabbedWorkspacePresenter } from '../../utils/createTabbedWorkspacePresenter.js';
import { renderWorkspaceLock } from '../common/renderWorkspaceLock.js';
import {
  VIEW_EBOOKS,
  VIEW_STOCK,
  VIEW_PRICING,
  initialState,
  ensureSelection,
  reduceSetView,
  reduceOpenLaunch,
  reduceToggleLaunch,
  reduceSelectInstance,
  derivePath,
  getSelectedCollection,
  getSelectedInstance
} from './state.js';
import renderHero from './hero.js';
import renderTabNavigation from './tabNavigation.js';
import renderInventoryTable from './inventoryTable.js';
import renderDetailPane from './detailPane.js';
import renderPricingCards from './pricingCards.js';

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'integer', clampZero: true });

const { describeSetupSummary: describeLaunchSetup, describeUpkeepSummary: describeLaunchUpkeep } =
  createCurrencyLifecycleSummary({
    parseValue: clampNumber,
    formatCurrency: value => `$${formatMoney(value)}`,
    formatDailyHours: hours => `${formatHours(hours)} per day`
  });

function confirmResourceLaunch(definition = {}) {
  const resourceName = definition.singular || definition.name || 'collection';
  const setupSummary = describeLaunchSetup(definition.setup);
  const upkeepSummary = describeLaunchUpkeep(definition.maintenance);
  return showLaunchConfirmation({
    theme: 'digishelf',
    icon: '📚',
    title: 'Publish this lineup?',
    resourceName,
    tagline: 'Preview the commitment, then dazzle the marketplace.',
    setupSummary,
    upkeepSummary,
    confirmLabel: 'Ship it',
    cancelLabel: 'Maybe later'
  });
}

function handleQualityAction(assetId, instanceId, actionId) {
  if (!assetId || !instanceId || !actionId) return;
  performQualityAction(assetId, instanceId, actionId);
}

function handleNicheSelect(assetId, instanceId, value) {
  if (!assetId || !instanceId || !value) return;
  selectDigishelfNiche(assetId, instanceId, value);
}

function renderHeader(model, state) {
  const fragment = document.createDocumentFragment();
  fragment.append(
    renderHero({
      model,
      state,
      formatCurrency,
      formatHours,
      formatMoney,
      onToggleLaunch: toggleLaunchPanel,
      onConfirmLaunch: confirmResourceLaunch
    }),
    renderTabNavigation(state, view => setView(view))
  );
  return fragment;
}

function renderPricingView(model) {
  return renderPricingCards({
    pricing: model.pricing,
    formatters: { formatCurrency, formatHours, formatMoney },
    onSelectPlan: handlePlanSelect
  });
}

function renderCollectionsView(model, state = initialState) {
  const wrapper = document.createElement('div');
  wrapper.className = 'digishelf-grid';

  const type = state.view === VIEW_STOCK ? 'stockPhotos' : 'ebook';
  const collection = getSelectedCollection(state, model) || {};
  const formatters = { formatCurrency, formatHours, formatMoney };

  const quickActions = {
    ebook: getDigishelfQuickActionIds('ebook'),
    stockPhotos: getDigishelfQuickActionIds('stockPhotos')
  };

  wrapper.appendChild(
    renderInventoryTable({
      instances: collection.instances || [],
      type,
      state,
      formatters,
      quickActions,
      handlers: {
        onSelectInstance: selectInstance,
        onRunQuickAction: handleQualityAction
      }
    })
  );

  const selected = getSelectedInstance(state, model);
  wrapper.appendChild(
    renderDetailPane({
      instance: selected,
      assetId: type,
      formatters,
      onSelectNiche: handleNicheSelect,
      onRunAction: handleQualityAction
    })
  );

  return wrapper;
}

function renderViews(model, state = initialState) {
  if (state.view === VIEW_PRICING) {
    return renderPricingView(model);
  }
  return renderCollectionsView(model, state);
}

function syncNavigation({ mount, state }) {
  if (!mount) return;
  mount.querySelectorAll('.digishelf-tab').forEach(tab => {
    const view = tab.dataset.view;
    const isActive = view === state?.view;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-pressed', String(Boolean(isActive)));
  });
}

function renderLockedWorkspace(model = {}, mount) {
  if (!mount) return;
  mount.innerHTML = '';
  mount.appendChild(
    renderWorkspaceLock({
      theme: {
        container: 'digishelf',
        locked: 'digishelf--locked',
        message: 'digishelf-empty',
        label: 'DigiShelf'
      },
      lock: model.lock,
      fallbackMessage: 'DigiShelf unlocks once the digital asset blueprints are discovered.'
    })
  );
}

function deriveWorkspaceSummary(model = {}) {
  const summary = typeof model?.summary === 'object' && model.summary
    ? { ...model.summary }
    : {};
  if (!summary.meta) {
    summary.meta = model?.overview?.meta || 'Curate your digital showcase';
  }
  return summary;
}

const presenter = createTabbedWorkspacePresenter({
  className: 'digishelf',
  state: { ...initialState },
  ensureSelection,
  derivePath,
  deriveSummary: deriveWorkspaceSummary,
  renderHeader,
  renderViews,
  renderLocked: renderLockedWorkspace,
  syncNavigation,
  isLocked: model => Boolean(model?.lock)
});

function setView(view) {
  const model = presenter.getModel();
  presenter.updateState(state => reduceSetView(state, model, view));
  presenter.render(model);
}

function toggleLaunchPanel() {
  const model = presenter.getModel();
  presenter.updateState(state => reduceToggleLaunch(state, model));
  presenter.render(model);
}

function selectInstance(type, id) {
  const model = presenter.getModel();
  presenter.updateState(state => reduceSelectInstance(state, model, type, id));
  presenter.render(model);
}

function handlePlanSelect(planId) {
  const model = presenter.getModel();
  presenter.updateState(state => {
    const next = reduceOpenLaunch(state, model);
    const targetView = planId === 'stockPhotos' ? VIEW_STOCK : VIEW_EBOOKS;
    return reduceSetView(next, model, targetView);
  });
  presenter.render(model);
}

export default function renderDigishelfWorkspace(model = {}, context = {}) {
  return presenter.render(model, context);
}
