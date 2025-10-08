import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getState } from '../../../../core/state.js';
import { selectBlogpressNiche } from '../../../cards/model/index.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import { calculateAssetSalePrice, sellAssetInstance } from '../../../../game/assets/actions.js';
import { formatCurrency as baseFormatCurrency, formatNetCurrency } from '../utils/formatting.js';
import { createCurrencyLifecycleSummary } from '../utils/lifecycleSummaries.js';
import { showLaunchConfirmation } from '../utils/launchDialog.js';
import { createTabbedWorkspacePresenter } from '../utils/createTabbedWorkspacePresenter.js';
import { createNavTabs } from './common/navBuilders.js';
import { createWorkspaceLockRenderer } from './common/renderWorkspaceLock.js';
import { getWorkspaceLockTheme } from './common/workspaceLockThemes.js';
import { formatBlogpressModel } from '../../../blogpress/blogModel.js';
import renderHomeView from './blogpress/views/homeView.js';
import createBackButton from './blogpress/views/createBackButton.js';
import { createDetailViewController } from './blogpress/views/createDetailViewController.js';
import renderOverviewPanel from './blogpress/views/renderOverviewPanel.js';
import renderNichePanel from './blogpress/views/renderNichePanel.js';
import renderQualityPanel from './blogpress/views/renderQualityPanel.js';
import renderIncomePanel from './blogpress/views/renderIncomePanel.js';
import renderPayoutPanel from './blogpress/views/renderPayoutPanel.js';
import renderActionPanel from './blogpress/views/renderActionPanel.js';
import renderUpkeepPanel from './blogpress/views/renderUpkeepPanel.js';
import renderPricingView from './blogpress/views/pricingView.js';
import renderBlueprintsView from './blogpress/views/blueprintsView.js';

const VIEW_HOME = 'home';
const VIEW_DETAIL = 'detail';
const VIEW_PRICING = 'pricing';
const VIEW_BLUEPRINTS = 'blueprints';

const INITIAL_STATE = {
  view: VIEW_HOME,
  selectedBlogId: null
};

const {
  theme: BLOGPRESS_LOCK_THEME,
  fallbackMessage: BLOGPRESS_LOCK_FALLBACK_MESSAGE
} = getWorkspaceLockTheme('blogpress');

const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'integer', clampZero: true });

const { describeSetupSummary, describeUpkeepSummary } = createCurrencyLifecycleSummary({
  formatCurrency: value => `$${formatMoney(value)}`,
  formatDailyHours: hours => `${formatHours(hours)} per day`
});

const renderDetailView = createDetailViewController({
  createBackButton,
  renderOverviewPanel,
  renderNichePanel,
  renderQualityPanel,
  renderIncomePanel,
  renderPayoutPanel,
  renderActionPanel,
  renderUpkeepPanel
});

function confirmBlogLaunch(definition = {}) {
  const resourceName = definition.singular || definition.name || 'blog';
  const setupSummary = describeSetupSummary(definition.setup);
  const upkeepSummary = describeUpkeepSummary(definition.maintenance);
  return showLaunchConfirmation({
    theme: 'blogpress',
    icon: '📰',
    title: 'Launch this blog?',
    resourceName,
    tagline: 'Blogs flourish when you honour the plan — ready to go live?',
    setupSummary,
    upkeepSummary,
    confirmLabel: 'Launch blog',
    cancelLabel: 'Keep planning'
  });
}

function confirmBlogSale({ label, price } = {}) {
  const formatted = formatCurrency(Math.max(0, Number(price) || 0));
  const resource = label || 'this blog';
  const message = price > 0
    ? `Sell ${resource} for ${formatted}? Fresh funds will head straight to your wallet.\n\nThis can’t be undone, but you can always spin up a new blog later.`
    : `Sell ${resource}? It hasn’t earned anything yet, so there’s no cash back — but you can clear the slot for a fresh idea.\n\nThis can’t be undone.`;
  if (typeof window === 'undefined') {
    return true;
  }
  return window.confirm(message);
}

function formatRange(range = {}) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 0;
  if (min <= 0 && max <= 0) {
    return 'No payout yet';
  }
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function ensureSelectedBlog(state = {}, model = {}) {
  const draftState = state;
  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) {
    draftState.selectedBlogId = null;
    if (draftState.view === VIEW_DETAIL) {
      draftState.view = VIEW_HOME;
    }
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0] || null;
  const target = instances.find(entry => entry.id === draftState.selectedBlogId);
  const resolved = target || active || fallback;
  draftState.selectedBlogId = resolved?.id ?? null;
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('blog', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectBlogpressNiche('blog', instanceId, value);
}

function handleSell(instance) {
  if (!instance?.definition || !instance?.id) return;
  const salePrice = Number.isFinite(Number(instance.salePrice))
    ? Math.max(0, Number(instance.salePrice))
    : calculateAssetSalePrice(instance.instance);
  const confirmed = confirmBlogSale({ label: instance.label, price: salePrice });
  if (!confirmed) {
    return;
  }
  const sold = sellAssetInstance(instance.definition, instance.id);
  if (sold) {
    setView(VIEW_HOME);
  }
}

async function handleBlueprintLaunch(model, launch = {}) {
  if (!launch.onClick) return;
  const confirmed = await confirmBlogLaunch(model.definition);
  if (!confirmed) {
    return;
  }
  launch.onClick();
  setView(VIEW_HOME);
}

function renderHeader(model, state = INITIAL_STATE) {
  const header = document.createElement('header');
  header.className = 'blogpress__header';

  const title = document.createElement('div');
  title.className = 'blogpress__title';
  const heading = document.createElement('h1');
  heading.textContent = 'BlogPress';
  const note = document.createElement('p');
  note.textContent = 'Your faux CMS for cozy blog empires.';
  title.append(heading, note);

  const activeCount = model.summary?.active || 0;
  const setupCount = model.summary?.setup || 0;
  const nav = createNavTabs({
    navClassName: 'blogpress-tabs',
    buttonClassName: 'blogpress-tab',
    badgeClassName: 'blogpress-tab__badge',
    datasetKey: 'view',
    withAriaPressed: true,
    onSelect: view => setView(view),
    buttons: [
      {
        label: 'My Blogs',
        view: VIEW_HOME,
        badge: activeCount || null,
        isActive: state.view === VIEW_HOME || state.view === VIEW_DETAIL
      },
      {
        label: 'Pricing',
        view: VIEW_PRICING,
        isActive: state.view === VIEW_PRICING
      },
      {
        label: 'Blueprints',
        view: VIEW_BLUEPRINTS,
        badge: setupCount || null,
        isActive: state.view === VIEW_BLUEPRINTS
      }
    ]
  });

  const actions = document.createElement('div');
  actions.className = 'blogpress__actions';
  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = 'blogpress-button blogpress-button--primary';
  launchButton.textContent = 'Spin up new blog';
  launchButton.addEventListener('click', () => setView(VIEW_BLUEPRINTS));
  actions.appendChild(launchButton);

  header.append(title, nav, actions);

  if (setupCount > 0) {
    const info = document.createElement('p');
    info.className = 'blogpress__hint';
    info.textContent = `${setupCount} blog${setupCount === 1 ? '' : 's'} finishing launch prep.`;
    header.appendChild(info);
  }

  return header;
}

function renderViews(model, state = INITIAL_STATE) {
  const formatters = {
    formatCurrency,
    formatHours,
    formatMoney,
    formatNetCurrency
  };

  switch (state.view) {
    case VIEW_PRICING:
      return renderPricingView({
        pricing: model.pricing,
        formatters,
        formatRange
      });
    case VIEW_BLUEPRINTS:
      return renderBlueprintsView({
        launch: model.launch,
        pricing: model.pricing,
        formatters,
        onLaunch: launchData => handleBlueprintLaunch(model, launchData)
      });
    case VIEW_DETAIL: {
      const instance = Array.isArray(model.instances)
        ? model.instances.find(entry => entry.id === state.selectedBlogId)
        : null;
      if (!instance) {
        return renderHomeView({
          model,
          state,
          formatters,
          handlers: {
            onViewDetail: blogId => setView(VIEW_DETAIL, { blogId }),
            onShowBlueprints: () => setView(VIEW_BLUEPRINTS),
            onRunQuickAction: handleQuickAction
          }
        });
      }
      const instanceWithSale = {
        ...instance,
        salePrice: calculateAssetSalePrice(instance.instance)
      };
      return renderDetailView({
        instance: instanceWithSale,
        formatters,
        formatRange,
        handlers: {
          onBack: () => setView(VIEW_HOME),
          onSelectNiche: handleNicheSelect,
          onViewDetail: blogId => setView(VIEW_DETAIL, { blogId }),
          onRunAction: (blogId, actionId) => handleQuickAction(blogId, actionId),
          onSell: handleSell
        }
      });
    }
    case VIEW_HOME:
    default:
      return renderHomeView({
        model,
        state,
        formatters,
        handlers: {
          onViewDetail: blogId => setView(VIEW_DETAIL, { blogId }),
          onShowBlueprints: () => setView(VIEW_BLUEPRINTS),
          onRunQuickAction: handleQuickAction
        }
      });
  }
}

function deriveWorkspaceSummary(model = {}) {
  const summary = model?.summary;
  return summary && typeof summary === 'object' ? summary : {};
}

function deriveWorkspacePath(state = {}) {
  switch (state.view) {
    case VIEW_PRICING:
      return 'pricing';
    case VIEW_BLUEPRINTS:
      return 'blueprints';
    case VIEW_DETAIL:
      return state.selectedBlogId ? `blog/${state.selectedBlogId}` : '';
    case VIEW_HOME:
    default:
      return '';
  }
}

function syncNavigation({ mount, state }) {
  if (!mount) return;
  const buttons = mount.querySelectorAll('.blogpress-tab');
  const view = state?.view || VIEW_HOME;
  buttons.forEach(button => {
    const isActive = button.dataset.view === view
      || (view === VIEW_DETAIL && button.dataset.view === VIEW_HOME);
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

const renderLocked = createWorkspaceLockRenderer({
  theme: BLOGPRESS_LOCK_THEME,
  fallbackMessage: BLOGPRESS_LOCK_FALLBACK_MESSAGE
});

const presenter = createTabbedWorkspacePresenter({
  className: 'blogpress',
  state: { ...INITIAL_STATE },
  ensureSelection: ensureSelectedBlog,
  renderLocked,
  renderHeader,
  renderViews,
  deriveSummary: deriveWorkspaceSummary,
  derivePath: deriveWorkspacePath,
  syncNavigation,
  isLocked: model => !model?.definition
});

function prepareModelForRender(model = {}) {
  if (!model?.definition || model?.lock) {
    return model;
  }
  const formatted = formatBlogpressModel({ definition: model.definition, state: getState() });
  return {
    ...model,
    summary: formatted.summary,
    instances: formatted.instances,
    nicheOptions: formatted.nicheOptions
  };
}

function setView(view, options = {}) {
  presenter.updateState(currentState => {
    const next = { ...currentState };
    const nextView = view || VIEW_HOME;
    if (nextView === VIEW_DETAIL && options.blogId) {
      next.selectedBlogId = options.blogId;
    }
    next.view = nextView;
    return next;
  });
  presenter.render(presenter.getModel());
}

export function render(model = {}, context = {}) {
  const preparedModel = prepareModelForRender(model);
  return presenter.render(preparedModel, context);
}

export default { render };
