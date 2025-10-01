import LayoutController from './LayoutController.js';

const layoutController = new LayoutController();

export function initLayoutControls() {
  layoutController.init();
}

export function applyCardFilters(models) {
  layoutController.applyFilters(models);
}

export function activateShellPanel(panelId) {
  layoutController.activateShellPanel(panelId);
}

export function syncLayoutView() {
  layoutController.syncView();
}

export default {
  initLayoutControls,
  activateShellPanel,
  applyCardFilters,
  syncLayoutView
};
