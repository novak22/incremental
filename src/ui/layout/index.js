import LayoutController from './LayoutController.js';

const layoutController = new LayoutController();

export function initLayoutControls() {
  layoutController.init();
}

export function applyCardFilters(models) {
  layoutController.applyFilters(models);
}

