import { createNavTabs } from '../common/navBuilders.js';
import { VIEW_EBOOKS, VIEW_STOCK, VIEW_UPGRADES, normalizeView } from './state.js';

export default function renderTabNavigation(state, onSelect = () => {}) {
  const activeView = normalizeView(state?.view);
  return createNavTabs({
    navClassName: 'digishelf-tabs',
    buttonClassName: 'digishelf-tab',
    datasetKey: 'view',
    withAriaPressed: true,
    onSelect,
    buttons: [
      {
        label: 'E-Books',
        view: VIEW_EBOOKS,
        isActive: activeView === VIEW_EBOOKS
      },
      {
        label: 'Stock Photos',
        view: VIEW_STOCK,
        isActive: activeView === VIEW_STOCK
      },
      {
        label: 'Upgrades & Plans',
        view: VIEW_UPGRADES,
        isActive: activeView === VIEW_UPGRADES
      }
    ]
  });
}
