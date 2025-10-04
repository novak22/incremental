export function createDetailViewController({
  createBackButton,
  renderOverviewPanel,
  renderNichePanel,
  renderQualityPanel,
  renderIncomePanel,
  renderPayoutPanel,
  renderActionPanel,
  renderUpkeepPanel
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

    const grid = document.createElement('div');
    grid.className = 'blogpress-detail-grid';

    if (renderNichePanel) {
      grid.appendChild(
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
      grid.appendChild(
        renderQualityPanel({
          instance,
          formatRange
        })
      );
    }

    if (renderIncomePanel) {
      grid.appendChild(
        renderIncomePanel({
          instance,
          formatCurrency,
          formatNetCurrency
        })
      );
    }

    if (renderPayoutPanel) {
      grid.appendChild(
        renderPayoutPanel({
          instance,
          formatCurrency
        })
      );
    }

    if (renderActionPanel) {
      grid.appendChild(
        renderActionPanel({
          instance,
          handlers: {
            onRunAction: handlers.onRunAction
          },
          formatHours,
          formatCurrency
        })
      );
    }

    if (renderUpkeepPanel) {
      grid.appendChild(
        renderUpkeepPanel({
          instance
        })
      );
    }

    container.appendChild(grid);
    return container;
  };
}

export default createDetailViewController;
