const elements = {
  money: document.getElementById('money'),
  sessionStatus: document.getElementById('session-status'),
  endDayButton: document.getElementById('end-day'),
  shellTabs: Array.from(document.querySelectorAll('.shell__tab')),
  panels: Array.from(document.querySelectorAll('.panel')),
  headerStats: {
    dailyPlus: {
      value: document.getElementById('header-daily-plus'),
      note: document.getElementById('header-daily-plus-note')
    },
    dailyMinus: {
      value: document.getElementById('header-daily-minus'),
      note: document.getElementById('header-daily-minus-note')
    },
    timeAvailable: {
      value: document.getElementById('header-time-available'),
      note: document.getElementById('header-time-available-note')
    },
    timeReserved: {
      value: document.getElementById('header-time-reserved'),
      note: document.getElementById('header-time-reserved-note')
    }
  },
  kpis: {
    cash: document.getElementById('kpi-cash'),
    net: document.getElementById('kpi-net'),
    hours: document.getElementById('kpi-hours'),
    upkeep: document.getElementById('kpi-upkeep'),
    assets: document.getElementById('kpi-assets'),
    study: document.getElementById('kpi-study')
  },
  kpiNotes: {
    cash: document.getElementById('kpi-cash-note'),
    net: document.getElementById('kpi-net-note'),
    hours: document.getElementById('kpi-hours-note'),
    upkeep: document.getElementById('kpi-upkeep-note'),
    assets: document.getElementById('kpi-assets-note'),
    study: document.getElementById('kpi-study-note')
  },
  kpiValues: {
    net: document.getElementById('kpi-net-value'),
    hours: document.getElementById('kpi-hours-value'),
    upkeep: document.getElementById('kpi-upkeep-value'),
    assets: document.getElementById('kpi-assets-value'),
    study: document.getElementById('kpi-study-value')
  },
  dailyStats: {
    timeSummary: document.getElementById('daily-time-summary'),
    timeList: document.getElementById('daily-time-list'),
    earningsSummary: document.getElementById('daily-earnings-summary'),
    earningsActive: document.getElementById('daily-earnings-active'),
    earningsPassive: document.getElementById('daily-earnings-passive'),
    spendSummary: document.getElementById('daily-spend-summary'),
    spendList: document.getElementById('daily-spend-list'),
    studySummary: document.getElementById('daily-study-summary'),
    studyList: document.getElementById('daily-study-list')
  },
  skills: {
    dashboard: {
      container: document.getElementById('dashboard-skills'),
      list: document.getElementById('dashboard-skills-list'),
      tier: document.getElementById('dashboard-skills-tier'),
      note: document.getElementById('dashboard-skills-progress')
    },
    education: {
      container: document.getElementById('education-skills'),
      list: document.getElementById('education-skills-list'),
      tier: document.getElementById('education-skills-tier'),
      note: document.getElementById('education-skills-progress')
    }
  },
  actionQueue: document.getElementById('action-queue'),
  queuePause: document.getElementById('queue-pause'),
  queueCancel: document.getElementById('queue-cancel'),
  quickActions: document.getElementById('quick-actions'),
  assetUpgradeActions: document.getElementById('asset-upgrade-actions'),
  notifications: document.getElementById('notification-list'),
  eventLogPreview: document.getElementById('event-log-preview'),
  openEventLog: document.getElementById('open-event-log'),
  eventLogPanel: document.getElementById('event-log-panel'),
  eventLogClose: document.getElementById('event-log-close'),
  logFeed: document.getElementById('log-feed'),
  logTemplate: document.getElementById('log-template'),
  logTip: document.getElementById('log-tip'),
  hustleSearch: document.getElementById('hustle-search'),
  hustleCategoryChips: document.getElementById('hustle-category-chips'),
  hustleRequirementChips: document.getElementById('hustle-req-chips'),
  hustleAvailableToggle: document.getElementById('hustle-available-toggle'),
  hustleSort: document.getElementById('hustle-sort'),
  hustleList: document.getElementById('hustle-list'),
  assetFilters: {
    activeOnly: document.getElementById('asset-active-toggle'),
    maintenance: document.getElementById('asset-maintenance-toggle'),
    lowRisk: document.getElementById('asset-risk-toggle')
  },
  assetTableBody: document.getElementById('asset-table-body'),
  assetSelectionNote: document.getElementById('asset-selection-note'),
  assetBatchButtons: {
    maintain: document.getElementById('asset-batch-maintain'),
    pause: document.getElementById('asset-batch-pause'),
    preset: document.getElementById('asset-batch-preset')
  },
  assetLaunched: {
    container: document.getElementById('asset-launched'),
    title: document.getElementById('asset-launched-title'),
    note: document.getElementById('asset-launched-note'),
    content: document.getElementById('asset-launched-content')
  },
  upgradeFilters: {
    affordable: document.getElementById('upgrade-affordable-toggle'),
    favorites: document.getElementById('upgrade-favorites-toggle')
  },
  upgradeOverview: {
    container: document.getElementById('upgrade-overview'),
    purchased: document.getElementById('upgrade-overview-owned'),
    ready: document.getElementById('upgrade-overview-ready'),
    favorites: document.getElementById('upgrade-overview-favorites'),
    note: document.getElementById('upgrade-overview-note')
  },
  upgradeEmpty: document.getElementById('upgrade-empty'),
  upgradeCategoryChips: document.getElementById('upgrade-category-chips'),
  upgradeSearch: document.getElementById('upgrade-search'),
  upgradeList: document.getElementById('upgrade-list'),
  upgradeDockList: document.getElementById('upgrade-dock-list'),
  studyFilters: {
    activeOnly: document.getElementById('study-active-toggle'),
    hideComplete: document.getElementById('study-hide-complete')
  },
  studyQueueList: document.getElementById('study-queue-list'),
  studyQueueEta: document.getElementById('study-queue-eta'),
  studyQueueCap: document.getElementById('study-queue-cap'),
  studyTrackList: document.getElementById('study-track-list'),
  slideOver: document.getElementById('slide-over'),
  slideOverBackdrop: document.querySelector('#slide-over .slide-over__backdrop'),
  slideOverClose: document.getElementById('slide-over-close'),
  slideOverTitle: document.getElementById('slide-over-title'),
  slideOverEyebrow: document.getElementById('slide-over-eyebrow'),
  slideOverContent: document.getElementById('slide-over-content'),
  commandPalette: document.getElementById('command-palette'),
  commandPaletteTrigger: document.getElementById('command-palette-trigger'),
  commandPaletteBackdrop: document.querySelector('#command-palette .command-palette__backdrop'),
  commandPaletteSearch: document.getElementById('command-palette-search'),
  commandPaletteResults: document.getElementById('command-palette-results')
};

export default elements;
