function focusDashboardSection(target) {
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  const highlight = target;
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusable = highlight.matches?.(selector)
    ? highlight
    : highlight.querySelector?.(`h2, h3, h4, ${selector}`);

  let cleanup;
  if (focusable) {
    focusable.focus?.({ preventScroll: true });
  } else {
    highlight.setAttribute('tabindex', '-1');
    highlight.focus?.({ preventScroll: true });
    cleanup = () => highlight.removeAttribute('tabindex');
  }

  highlight.classList?.add?.('is-kpi-highlight');
  window.setTimeout(() => highlight.classList?.remove?.('is-kpi-highlight'), 1400);

  if (cleanup) {
    window.setTimeout(cleanup, 700);
  }
}

export function setupKpiShortcuts({ getElement } = {}) {
  const registry = typeof getElement === 'function' ? getElement('kpis') : null;
  const buttons = Object.values(registry || {}).filter(Boolean);
  if (!buttons.length) {
    return;
  }

  const dailyStats = (typeof getElement === 'function' ? getElement('dailyStats') : null) || {};
  const notifications = typeof getElement === 'function' ? getElement('notifications') : null;
  const assetUpgradeActions = typeof getElement === 'function' ? getElement('assetUpgradeActions') : null;
  const sessionStatus = typeof getElement === 'function' ? getElement('sessionStatus') : null;

  const targetLookup = {
    cash: () => dailyStats.earningsActive?.closest?.('.daily-stats__section')
      || dailyStats.earningsActive
      || dailyStats.earningsSummary,
    net: () => dailyStats.spendList?.closest?.('.daily-stats__section')
      || dailyStats.spendList
      || dailyStats.spendSummary,
    time: () => dailyStats.timeList?.closest?.('.daily-stats__section')
      || dailyStats.timeList
      || dailyStats.timeSummary,
    upkeep: () => notifications?.closest?.('.dashboard-card') || notifications,
    assets: () => assetUpgradeActions?.closest?.('.dashboard-card') || assetUpgradeActions,
    study: () => dailyStats.studyList?.closest?.('.daily-stats__section')
      || dailyStats.studyList
      || dailyStats.studySummary
  };

  const statusMessages = {
    cash: 'Scooting to the daily earnings breakdown.',
    net: 'Reviewing how today’s inflows and outflows balance.',
    time: 'Hopping down to the time ledger for today.',
    upkeep: 'Checking upkeep reminders and notifications.',
    assets: 'Spotlighting active ventures and upgrade prospects.',
    study: 'Beaming over to the study progress section.'
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const detail = button.dataset.detail;
      const target = targetLookup[detail]?.();
      if (!target) return;

      focusDashboardSection(target);
      const message = statusMessages[detail];
      if (message && sessionStatus) {
        sessionStatus.textContent = message;
      }
    });
  });
}

