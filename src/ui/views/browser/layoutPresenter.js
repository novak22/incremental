import { HOMEPAGE_ID, findPageById, findPageBySlug } from './config.js';
import { initThemeControls } from './layout/theme.js';
import { createNavigationController } from './layout/navigation.js';
import { initTabControls, openTab, closeTab, setActiveTab, isOpen, getFallbackTab } from './layout/tabs.js';
import {
  getLaunchStage,
  getWorkspaceHost,
  getHomepageElement,
  getWorkspaceElement,
  buildWorkspaceUrl,
  setWorkspacePath as setWorkspacePathDom
} from './layout/workspaces.js';
import createViewportManager from './layout/viewportManager.js';
import createWorkspaceViewManager from './layout/workspaceViewManager.js';
import createTabSessionController from './layout/tabSessionController.js';
import createNavigationEventsController from './layout/navigationEventsController.js';
import createWidgetReorderController from './widgets/widgetReorderController.js';

const navigationController = createNavigationController({ homepageId: HOMEPAGE_ID });
const viewportManager = createViewportManager();

const workspaceManager = createWorkspaceViewManager({
  navigationController,
  viewportManager,
  tabs: {
    openTab,
    closeTab,
    setActiveTab,
    isOpen,
    getFallbackTab
  },
  dom: {
    getLaunchStage,
    getWorkspaceHost,
    getHomepageElement,
    getWorkspaceElement,
    buildWorkspaceUrl,
    setWorkspacePathDom
  },
  pageResolver: {
    homepageId: HOMEPAGE_ID,
    findPageById,
    findPageBySlug
  }
});

const tabSessionController = createTabSessionController({
  initTabControls,
  workspaceManager
});

const navigationEventsController = createNavigationEventsController({
  navigationController,
  workspaceManager,
  pageResolver: {
    homepageId: HOMEPAGE_ID,
    findPageById,
    findPageBySlug
  },
  dom: {
    buildWorkspaceUrl,
    getHomepageElement
  }
});

const widgetReorderController = createWidgetReorderController();

const layoutPresenter = {
  initControls() {
    tabSessionController.init();
    navigationEventsController.init();
    initThemeControls();
    widgetReorderController.init();
  },
  applyFilters: workspaceManager.applyFilters
};

export default layoutPresenter;

export function setWorkspacePath(pageId, path) {
  workspaceManager.setWorkspacePath(pageId, path);
}
