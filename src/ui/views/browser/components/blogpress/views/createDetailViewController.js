export function createDetailViewController({
  createBackButton,
  renderOverviewPanel,
  renderNichePanel,
  renderQualityPanel,
  renderIncomePanel,
  renderPayoutPanel,
  renderActionPanel,
  renderUpkeepPanel,
  renderActivityPanel
} = {}) {
  return function renderDetailView({
    instance = null,
    formatters = {},
    handlers = {},
    formatRange = () => 'No payout yet'
  } = {}) {
    if (!instance) {
      return null;
    }

    const {
      formatCurrency = value => String(value ?? ''),
      formatNetCurrency = value => String(value ?? ''),
      formatHours = value => String(value ?? '')
    } = formatters;

    const container = document.createElement('section');
    container.className = 'blogpress-view blogpress-view--detail';

    if (createBackButton) {
      container.appendChild(
        createBackButton({
          onClick: handlers.onBack,
          label: 'Back to blogs'
        })
      );
    }

    if (renderOverviewPanel) {
      container.appendChild(
        renderOverviewPanel({
          instance,
          formatCurrency
        })
      );
    }

    const layout = document.createElement('div');
    layout.className = 'blogpress-detail-layout';

    const primaryColumn = document.createElement('div');
    primaryColumn.className = 'blogpress-detail-layout__column blogpress-detail-layout__column--primary';
    const secondaryColumn = document.createElement('div');
    secondaryColumn.className = 'blogpress-detail-layout__column blogpress-detail-layout__column--secondary';

    if (renderNichePanel) {
      primaryColumn.appendChild(
        renderNichePanel({
          instance,
          handlers: {
            onSelectNiche: handlers.onSelectNiche,
            onViewDetail: handlers.onViewDetail
          }
        })
      );
    }

    if (renderQualityPanel) {
      primaryColumn.appendChild(
        renderQualityPanel({
          instance,
          formatRange
        })
      );
    }

    if (renderUpkeepPanel) {
      primaryColumn.appendChild(
        renderUpkeepPanel({
          instance
        })
      );
    }

    if (renderActivityPanel) {
      primaryColumn.appendChild(
        renderActivityPanel({
          instance,
          formatCurrency,
          formatHours
        })
      );
    }

    if (renderIncomePanel) {
      secondaryColumn.appendChild(
        renderIncomePanel({
          instance,
          formatCurrency,
          formatNetCurrency
        })
      );
    }

    if (renderPayoutPanel) {
      secondaryColumn.appendChild(
        renderPayoutPanel({
          instance,
          formatCurrency
        })
      );
    }

    if (renderActionPanel) {
      secondaryColumn.appendChild(
        renderActionPanel({
          instance,
          handlers: {
            onRunAction: handlers.onRunAction,
            onSell: handlers.onSell
          },
          formatHours,
          formatCurrency
        })
      );
    }

    layout.append(primaryColumn, secondaryColumn);
    container.appendChild(layout);
    return container;
  };
}

export default createDetailViewController;
