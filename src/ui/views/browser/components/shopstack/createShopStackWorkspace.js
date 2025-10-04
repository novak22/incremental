import { createConfiguredAssetWorkspace } from '../../utils/createConfiguredAssetWorkspace.js';
import {
  initialState,
  ensureSelection as ensureCatalogSelection,
  reduceCategory,
  reduceSearch,
  reduceSelectCatalogItem,
  VIEW_CATALOG,
  VIEW_PRICING,
  VIEW_PURCHASES
} from './state.js';
import {
  createDefinitionMap,
  collectCatalogItems,
  filterCatalogItems,
  computeCatalogOverview
} from './catalogData.js';
import { deriveShopStackPath } from './routes.js';
import renderCatalogView from './views/catalogView.js';
import renderPurchasesView from './views/purchasesView.js';
import renderPricingView from './views/pricingView.js';

function describeOverviewSummary(model = {}, definitionMap = new Map()) {
  const overview = computeCatalogOverview(collectCatalogItems(model, definitionMap));
  const purchased = Number(overview.purchased || 0);
  const ready = Number(overview.ready || 0);
  const total = Number(overview.total || 0);
  const summaryEntries = [
    `${total} item${total === 1 ? '' : 's'} tracked`,
    `${purchased} owned`,
    ready > 0 ? `${ready} ready to buy` : 'Browse upcoming unlocks'
  ];
  return summaryEntries.join(' • ');
}

function deriveWorkspaceSummary(model = {}, definitionMap = new Map()) {
  const overview = computeCatalogOverview(collectCatalogItems(model, definitionMap));
  const ready = Number(overview.ready || 0);
  const purchased = Number(overview.purchased || 0);
  if (ready > 0) {
    return { meta: `${ready} upgrade${ready === 1 ? '' : 's'} ready` };
  }
  if (purchased > 0) {
    return { meta: `${purchased} owned` };
  }
  return { meta: 'Browse premium upgrades' };
}

function createCatalogHandlers({ presenter, definitionMap }) {
  return {
    onSelectItem: itemId => {
      presenter.updateState(current => reduceSelectCatalogItem(current, presenter.getModel(), definitionMap, itemId));
    },
    onSearch: value => {
      presenter.updateState(current => reduceSearch(current, presenter.getModel(), definitionMap, value));
    },
    onSelectCategory: categoryId => {
      presenter.updateState(current => reduceCategory(current, presenter.getModel(), definitionMap, categoryId));
    }
  };
}

export function createShopStackWorkspacePresenter() {
  let definitionMap = new Map();
  let presenter;

  function ensureSelection(state, model) {
    ensureCatalogSelection(state, model, definitionMap);
  }

  function derivePath(state, model) {
    return deriveShopStackPath(state, model, definitionMap);
  }

  function handleBuy(definition, button) {
    if (!definition?.action) return;
    if (button) {
      button.disabled = true;
    }
    try {
      definition.action.onClick?.();
    } finally {
      presenter?.refresh?.();
    }
  }

  presenter = createConfiguredAssetWorkspace({
    assetType: 'shopstack',
    className: 'shopstack',
    defaultView: VIEW_CATALOG,
    state: { ...initialState },
    ensureSelection,
    deriveSummary: model => deriveWorkspaceSummary(model, definitionMap),
    derivePath,
    isLocked: () => false,
    header(model, _state, sharedContext) {
      const pageMeta = sharedContext.presenter?.getPage?.() || {};
      return {
        className: 'shopstack__header',
        title: pageMeta.headline || 'ShopStack Platform',
        subtitle: pageMeta.tagline || 'Browse upgrades, compare bonuses, and fuel your next spike.',
        meta: describeOverviewSummary(model, definitionMap),
        theme: {
          header: 'shopstack__header',
          intro: 'shopstack__title-row',
          title: 'shopstack__title',
          subtitle: 'shopstack__note',
          meta: 'shopstack-summary',
          nav: 'shopstack-nav',
          button: 'shopstack-tab'
        },
        nav: {
          navClassName: 'shopstack-nav',
          buttonClassName: 'shopstack-tab'
        }
      };
    },
    views: [
      {
        id: VIEW_CATALOG,
        label: 'Catalog',
        badge: ({ model, state }) => {
          const items = collectCatalogItems(model, definitionMap);
          const filtered = filterCatalogItems(items, state);
          const ready = filtered.filter(item => item.model?.snapshot?.ready).length;
          return ready > 0 ? ready : null;
        },
        render(context) {
          const handlers = createCatalogHandlers({ presenter, definitionMap });
          return renderCatalogView({
            model: context.model,
            state: context.state,
            definitionMap,
            handlers: {
              ...handlers,
              onBuy: handleBuy
            }
          });
        }
      },
      {
        id: VIEW_PURCHASES,
        label: 'My Purchases',
        badge: ({ model }) => {
          const items = collectCatalogItems(model, definitionMap);
          const owned = items.filter(item => item.model?.snapshot?.purchased).length;
          return owned > 0 ? owned : null;
        },
        render(context) {
          return renderPurchasesView({
            model: context.model,
            definitionMap
          });
        }
      },
      {
        id: VIEW_PRICING,
        label: 'Pricing FAQ',
        render: () => renderPricingView()
      }
    ]
  });

  const originalRender = presenter.render.bind(presenter);
  presenter.render = (model = {}, context = {}) => {
    if (Array.isArray(context.definitions)) {
      definitionMap = createDefinitionMap(context.definitions);
    }
    return originalRender(model, context);
  };

  return presenter;
}

export default {
  createShopStackWorkspacePresenter
};
