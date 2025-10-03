import { createNavTabs } from '../common/navBuilders.js';
import { VIEW_EBOOKS, VIEW_STOCK, VIEW_PRICING } from './state.js';

export default function renderTabNavigation(state, onSelect = () => {}) {
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
        isActive: state?.view === VIEW_EBOOKS
      },
      {
        label: 'Stock Photos',
        view: VIEW_STOCK,
        isActive: state?.view === VIEW_STOCK
      },
      {
        label: 'Pricing & Plans',
        view: VIEW_PRICING,
        isActive: state?.view === VIEW_PRICING
      }
    ]
  });
}
