import { DETAIL_THEME, mapDetailSections } from './detailSections.js';

export default function mapStoreDetail(model, state, dependencies = {}) {
  const { selectors = {}, formatters = {}, handlers = {} } = dependencies;
  const instance = selectors.getSelectedStore ? selectors.getSelectedStore(state, model) : null;
  if (!instance) {
    return {
      theme: DETAIL_THEME,
      className: 'shopily-detail',
      isEmpty: true,
      emptyState: {
        message: 'Select a store to inspect payouts, niches, and upgrades.'
      }
    };
  }
  const helpers = {
    ...formatters,
    onRunAction: handlers.onRunAction,
    onSelectNiche: handlers.onSelectNiche
  };
  return {
    theme: DETAIL_THEME,
    className: 'shopily-detail',
    header: {
      title: instance.label,
      status: {
        className: 'shopily-status',
        label: instance.status?.label || 'Setup',
        dataset: { state: instance.status?.id || 'setup' }
      }
    },
    sections: mapDetailSections(instance, helpers)
  };
}
