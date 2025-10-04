import renderActionConsole from './actionConsole.js';
import { renderNichePanel } from './nicheSelector.js';
import renderPayoutBreakdown from './payoutBreakdown.js';
import renderQualityPanel from './qualityPanel.js';

const DETAIL_THEME = {
  container: 'asset-detail serverhub-sidebar',
  header: 'serverhub-detail__header',
  title: 'serverhub-detail__title',
  subtitle: 'serverhub-detail__subtitle',
  status: 'serverhub-status',
  tabs: 'serverhub-detail__tabs',
  stats: 'asset-detail__stats serverhub-detail__stats',
  stat: 'asset-detail__stat serverhub-detail__stat',
  statLabel: 'asset-detail__stat-label serverhub-detail__stat-label',
  statValue: 'asset-detail__stat-value serverhub-detail__stat-value',
  statNote: 'asset-detail__stat-note serverhub-detail__stat-note',
  sections: 'asset-detail__sections serverhub-detail__grid',
  section: 'asset-detail__section serverhub-panel',
  sectionTitle: 'asset-detail__section-title',
  sectionBody: 'asset-detail__section-body serverhub-panel__hint',
  actions: 'asset-detail__actions serverhub-action-group',
  actionButton: 'serverhub-button serverhub-button--ghost serverhub-button--compact',
  empty: 'asset-detail__empty serverhub-detail__empty'
};

const DETAIL_STATS_CONFIG = [
  {
    label: 'Daily earnings',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.latestPayout)
  },
  {
    label: 'Average daily',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.averagePayout)
  },
  {
    label: 'Pending income',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.pendingIncome)
  },
  {
    label: 'Lifetime revenue',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.lifetimeIncome)
  },
  {
    label: 'Lifetime spend',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.lifetimeSpend)
  },
  {
    label: 'Net profit',
    getValue: (instance, helpers) => helpers.formatNetCurrency(instance.profit)
  },
  {
    label: 'ROI',
    getValue: (instance, helpers) => helpers.formatPercent(instance.roi)
  },
  {
    label: 'Days live',
    getValue: instance => `${instance.daysLive} day${instance.daysLive === 1 ? '' : 's'}`
  }
];

const DETAIL_PANELS = [
  instance => renderQualityPanel(instance),
  (instance, helpers) => renderNichePanel(instance, helpers),
  (instance, helpers) => renderPayoutBreakdown(instance, helpers),
  (instance, helpers) => renderActionConsole(instance, helpers)
];

function createPanelSection(renderPanel, instance, helpers) {
  const preview = renderPanel(instance, helpers);
  if (!preview) {
    return null;
  }
  const className = preview.className || DETAIL_THEME.section;
  return {
    className,
    render: ({ article }) => {
      const panel = renderPanel(instance, helpers);
      if (!panel) return;
      while (panel.firstChild) {
        article.appendChild(panel.firstChild);
      }
    }
  };
}

function mapDetailSections(instance, helpers) {
  return DETAIL_PANELS
    .map(renderPanel => createPanelSection(renderPanel, instance, helpers))
    .filter(Boolean);
}

function mapDetailStats(instance, helpers) {
  return DETAIL_STATS_CONFIG.map(entry => ({
    label: entry.label,
    value: entry.getValue(instance, helpers),
    note: typeof entry.getNote === 'function' ? entry.getNote(instance, helpers) : entry.note
  }));
}

export function mapDetailSidebar(model = {}, state = {}, helpers = {}) {
  const selected = typeof helpers.getSelectedApp === 'function'
    ? helpers.getSelectedApp(model, state)
    : null;

  if (!selected) {
    return {
      theme: DETAIL_THEME,
      className: 'serverhub-sidebar',
      isEmpty: true,
      emptyState: {
        title: 'Select an app',
        message: 'Choose an app to inspect uptime, payouts, and quality progress.'
      }
    };
  }

  return {
    theme: DETAIL_THEME,
    className: 'serverhub-sidebar',
    header: {
      title: selected.label,
      status: {
        className: 'serverhub-status',
        dataset: { state: selected.status?.id || 'setup' },
        label: selected.status?.label || 'Setup'
      }
    },
    stats: mapDetailStats(selected, helpers),
    sections: mapDetailSections(selected, helpers)
  };
}
