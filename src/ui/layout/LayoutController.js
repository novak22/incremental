import { getElement } from '../elements/registry.js';
import { buildLayoutModel, getLayoutPreferences, updateLayoutPreferences } from './model.js';
import { getActiveView } from '../viewManager.js';
import classicLayoutPresenter from '../views/classic/layoutPresenter.js';
import { setupTabs } from './features/tabs.js';
import { setupEventLog } from './features/eventLog.js';
import { setupSlideOver } from './features/slideOver.js';
import { setupKpiShortcuts } from './features/kpiShortcuts.js';
import {
  ensureDefaultPreferenceAdapters,
  getPreferenceAdapters
} from './preferenceAdapters.js';

export class LayoutController {
  constructor(options = {}) {
    this.getElement = options.getElement || getElement;
    this.buildLayoutModel = options.buildLayoutModel || buildLayoutModel;
    this.getPreferences = options.getLayoutPreferences || getLayoutPreferences;
    this.updatePreferences = options.updateLayoutPreferences || updateLayoutPreferences;
    this.getActiveView = options.getActiveView || getActiveView;
    this.preferenceAdapterSource =
      options.preferenceAdapters ?? options.preferenceAdapterSource ?? null;
    this.preferenceAdapterResolver = options.getPreferenceAdapters || getPreferenceAdapters;
    this.defaultPresenter = options.defaultPresenter || classicLayoutPresenter;
    this.logger = options.logger || console;
    this.features = {
      setupTabs: options.setupTabs || setupTabs,
      setupEventLog: options.setupEventLog || setupEventLog,
      setupSlideOver: options.setupSlideOver || setupSlideOver,
      setupKpiShortcuts: options.setupKpiShortcuts || setupKpiShortcuts
    };

    this.activePanelController = null;
    this.currentCardModels = null;
    this.layoutPresenterInitialized = false;
    this.presenterRef = null;
    this.activeViewId = null;

    this.handlePreferenceChange = this.handlePreferenceChange.bind(this);
  }

  init() {
    ensureDefaultPreferenceAdapters();
    const baseContext = { getElement: this.getElement };
    this.features.setupTabs?.({
      ...baseContext,
      onActivate: activate => {
        this.activePanelController = activate;
      }
    });
    this.features.setupEventLog?.(baseContext);
    this.features.setupSlideOver?.(baseContext);
    this.features.setupKpiShortcuts?.(baseContext);

    this.syncView();
    this.applyFilters();
  }

  syncView() {
    this.refreshPresenterState();
    this.initializeLayoutPresenter();
  }

  applyFilters(models) {
    if (models) {
      this.currentCardModels = models;
    }

    this.syncView();
    this.syncPreferencesFromDom();

    const presenter = this.getPresenterInstance();
    if (!presenter?.applyFilters || !this.currentCardModels) {
      return;
    }

    const model = this.buildLayoutModel(this.currentCardModels);
    presenter.applyFilters(model);
  }

  activateShellPanel(panelId) {
    if (!panelId) return;
    if (typeof this.activePanelController === 'function') {
      this.activePanelController(panelId);
      return;
    }
    const lookup = this.getElement('shellNavigation') || {};
    const shellTabs = Array.isArray(lookup.shellTabs) ? lookup.shellTabs : [];
    const tab = shellTabs.find(button => button?.getAttribute?.('aria-controls') === panelId);
    tab?.click?.();
  }

  syncPreferencesFromDom() {
    const adapters = this.resolvePreferenceAdapters();
    adapters.forEach(adapter => {
      try {
        const elementLookup = this.getElement(adapter.elementKey) || {};
        const patch = adapter.read(elementLookup, { getElement: this.getElement });
        if (patch && typeof patch === 'object') {
          this.updatePreferences(adapter.section, patch);
        }
      } catch (error) {
        this.logger?.error?.('Failed to sync layout preferences', error);
      }
    });
  }

  refreshPresenterState() {
    const view = this.getActiveView?.();
    const nextViewId = view?.id || null;
    if (nextViewId !== this.activeViewId) {
      this.layoutPresenterInitialized = false;
      this.presenterRef = null;
      this.activeViewId = nextViewId;
    }
  }

  getPresenterInstance() {
    const view = this.getActiveView?.();
    if (view?.presenters?.layout) {
      return view.presenters.layout;
    }
    if (!view) {
      return this.defaultPresenter;
    }
    return null;
  }

  initializeLayoutPresenter() {
    const presenter = this.getPresenterInstance();
    if (!presenter?.initControls) {
      return;
    }
    if (this.layoutPresenterInitialized && this.presenterRef === presenter) {
      return;
    }

    presenter.initControls({
      onChange: this.handlePreferenceChange,
      getPreferences: this.getPreferences
    });
    this.layoutPresenterInitialized = true;
    this.presenterRef = presenter;
  }

  handlePreferenceChange(section, patch) {
    this.updatePreferences(section, patch);
    this.applyFilters();
  }

  resolvePreferenceAdapters() {
    const source =
      this.preferenceAdapterSource ??
      this.preferenceAdapterResolver ??
      getPreferenceAdapters;

    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source === 'function') {
      const resolved = source();
      return Array.isArray(resolved) ? resolved : [];
    }

    return [];
  }
}

export default LayoutController;
