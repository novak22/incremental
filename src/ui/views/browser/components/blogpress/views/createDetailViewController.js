export function createDetailViewController({
  createBackButton,
  renderOverviewPanel,
  renderNichePanel,
  renderQualityPanel,
  renderIncomePanel,
  renderActionPanel,
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
      formatHours = value => String(value ?? ''),
      formatPercent = value => String(value ?? '')
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

    const primaryTier = document.createElement('div');
    primaryTier.className = 'blogpress-detail-tier blogpress-detail-tier--primary';
    const secondaryTier = document.createElement('div');
    secondaryTier.className = 'blogpress-detail-tier blogpress-detail-tier--secondary';
    const detailEntries = [];

    if (renderQualityPanel) {
      const performanceResult = renderQualityPanel({
        instance,
        formatRange
      });
      const performancePanel = performanceResult?.panel || performanceResult;
      const performanceDetails = performanceResult?.details;
      if (performancePanel instanceof HTMLElement) {
        primaryTier.appendChild(performancePanel);
      }
      if (performanceDetails instanceof HTMLElement) {
        detailEntries.push(performanceDetails);
      }
    }

    if (renderIncomePanel) {
      const earningsPanel = renderIncomePanel({
        instance,
        formatCurrency,
        formatNetCurrency,
        formatPercent
      });
      if (earningsPanel instanceof HTMLElement) {
        primaryTier.appendChild(earningsPanel);
      }
    }

    if (renderActionPanel) {
      const actionsPanel = renderActionPanel({
        instance,
        handlers: {
          onRunAction: handlers.onRunAction,
          onSell: handlers.onSell
        },
        formatHours,
        formatCurrency
      });
      if (actionsPanel instanceof HTMLElement) {
        primaryTier.appendChild(actionsPanel);
      }
    }

    if (renderNichePanel) {
      const nichePanel = renderNichePanel({
        instance,
        handlers: {
          onSelectNiche: handlers.onSelectNiche,
          onViewDetail: handlers.onViewDetail
        }
      });
      if (nichePanel instanceof HTMLElement) {
        secondaryTier.appendChild(nichePanel);
      }
    }

    if (renderActivityPanel) {
      const activityPanel = renderActivityPanel({
        instance,
        formatCurrency,
        formatHours
      });
      if (activityPanel instanceof HTMLElement) {
        detailEntries.push(activityPanel);
      }
    }

    if (primaryTier.children.length > 0) {
      layout.appendChild(primaryTier);
    }
    if (secondaryTier.children.length > 0) {
      layout.appendChild(secondaryTier);
    }

    container.appendChild(layout);

    if (detailEntries.length > 0) {
      const details = document.createElement('details');
      details.className = 'blogpress-details';

      const summary = document.createElement('summary');
      summary.className = 'blogpress-details__summary';
      const summaryParts = detailEntries
        .map(entry => entry?.dataset?.summaryLabel)
        .filter(Boolean)
        .slice(0, 2);
      summary.textContent = summaryParts.length
        ? summaryParts.join(' • ')
        : 'Milestones log snapshot';
      details.appendChild(summary);

      const content = document.createElement('div');
      content.className = 'blogpress-details__content';
      detailEntries.forEach(entry => content.appendChild(entry));
      details.appendChild(content);

      container.appendChild(details);
    }
    return container;
  };
}

export default createDetailViewController;
