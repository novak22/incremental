import { buildLayoutModel, getLayoutPreferences, updateLayoutPreferences } from './model.js';
import { getActiveView } from '../viewManager.js';

export class LayoutController {
  constructor(options = {}) {
    this.buildLayoutModel = options.buildLayoutModel || buildLayoutModel;
    this.getPreferences = options.getLayoutPreferences || getLayoutPreferences;
    this.updatePreferences = options.updateLayoutPreferences || updateLayoutPreferences;
    this.getActiveView = options.getActiveView || getActiveView;
    this.logger = options.logger || console;

    this.currentCardModels = null;
    this.layoutPresenterInitialized = false;
    this.presenterRef = null;
    this.activeViewId = null;

    this.handlePreferenceChange = this.handlePreferenceChange.bind(this);
  }

  init() {
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

    const presenter = this.getPresenterInstance();
    if (!presenter?.applyFilters || !this.currentCardModels) {
      return;
    }

    const model = this.buildLayoutModel(this.currentCardModels);
    presenter.applyFilters(model);
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
    return view?.presenters?.layout ?? null;
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
}

export default LayoutController;
