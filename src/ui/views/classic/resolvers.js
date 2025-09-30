const resolvers = {
  money: root => root.getElementById('money'),
  sessionStatus: root => root.getElementById('session-status'),
  headerActionButtons: root => ({
    endDayButton: root.getElementById('end-day'),
    autoForwardButton: root.getElementById('auto-forward')
  }),
  shellNavigation: root => ({
    shellTabs: Array.from(root.querySelectorAll('.shell__tab')),
    panels: Array.from(root.querySelectorAll('.panel'))
  }),
  headerStats: root => ({
    dailyPlus: {
      value: root.getElementById('header-daily-plus'),
      note: root.getElementById('header-daily-plus-note')
    },
    dailyMinus: {
      value: root.getElementById('header-daily-minus'),
      note: root.getElementById('header-daily-minus-note')
    },
    timeAvailable: {
      value: root.getElementById('header-time-available'),
      note: root.getElementById('header-time-available-note')
    },
    timeReserved: {
      value: root.getElementById('header-time-reserved'),
      note: root.getElementById('header-time-reserved-note')
    }
  }),
  kpis: root => ({
    cash: root.getElementById('kpi-cash'),
    net: root.getElementById('kpi-net'),
    hours: root.getElementById('kpi-hours'),
    upkeep: root.getElementById('kpi-upkeep'),
    ventures: root.getElementById('kpi-ventures'),
    study: root.getElementById('kpi-study')
  }),
  kpiNotes: root => ({
    cash: root.getElementById('kpi-cash-note'),
    net: root.getElementById('kpi-net-note'),
    hours: root.getElementById('kpi-hours-note'),
    upkeep: root.getElementById('kpi-upkeep-note'),
    ventures: root.getElementById('kpi-ventures-note'),
    study: root.getElementById('kpi-study-note')
  }),
  kpiValues: root => ({
    net: root.getElementById('kpi-net-value'),
    hours: root.getElementById('kpi-hours-value'),
    upkeep: root.getElementById('kpi-upkeep-value'),
    ventures: root.getElementById('kpi-ventures-value'),
    study: root.getElementById('kpi-study-value')
  }),
  dailyStats: root => ({
    timeSummary: root.getElementById('daily-time-summary'),
    timeList: root.getElementById('daily-time-list'),
    earningsSummary: root.getElementById('daily-earnings-summary'),
    earningsActive: root.getElementById('daily-earnings-active'),
    earningsPassive: root.getElementById('daily-earnings-passive'),
    spendSummary: root.getElementById('daily-spend-summary'),
    spendList: root.getElementById('daily-spend-list'),
    studySummary: root.getElementById('daily-study-summary'),
    studyList: root.getElementById('daily-study-list')
  }),
  nicheTrends: root => ({
    highlightHot: root.getElementById('analytics-highlight-hot'),
    highlightHotNote: root.getElementById('analytics-highlight-hot-note'),
    highlightSwing: root.getElementById('analytics-highlight-swing'),
    highlightSwingNote: root.getElementById('analytics-highlight-swing-note'),
    highlightRisk: root.getElementById('analytics-highlight-risk'),
    highlightRiskNote: root.getElementById('analytics-highlight-risk-note'),
    board: root.getElementById('niche-board'),
    sortButtons: Array.from(root.querySelectorAll('[data-niche-sort]')),
    filterInvested: root.getElementById('niche-filter-invested'),
    filterWatchlist: root.getElementById('niche-filter-watchlist')
  }),
  skillSections: root => ({
    dashboard: {
      container: root.getElementById('dashboard-skills'),
      list: root.getElementById('dashboard-skills-list'),
      tier: root.getElementById('dashboard-skills-tier'),
      note: root.getElementById('dashboard-skills-progress')
    },
    education: {
      container: root.getElementById('education-skills'),
      list: root.getElementById('education-skills-list'),
      tier: root.getElementById('education-skills-tier'),
      note: root.getElementById('education-skills-progress')
    }
  }),
  queueNodes: root => ({
    actionQueue: root.getElementById('action-queue'),
    queuePause: root.getElementById('queue-pause'),
    queueCancel: root.getElementById('queue-cancel')
  }),
  quickActions: root => root.getElementById('quick-actions'),
  assetUpgradeActions: root => root.getElementById('asset-upgrade-actions'),
  notifications: root => root.getElementById('notification-list'),
  eventLogPreview: root => root.getElementById('event-log-preview'),
  eventLogControls: root => ({
    openEventLog: root.getElementById('open-event-log'),
    eventLogPanel: root.getElementById('event-log-panel'),
    eventLogClose: root.getElementById('event-log-close')
  }),
  logNodes: root => ({
    logFeed: root.getElementById('log-feed'),
    logTemplate: root.getElementById('log-template'),
    logTip: root.getElementById('log-tip')
  }),
  hustleControls: root => ({
    hustleSearch: root.getElementById('hustle-search'),
    hustleCategoryChips: root.getElementById('hustle-category-chips'),
    hustleRequirementChips: root.getElementById('hustle-req-chips'),
    hustleAvailableToggle: root.getElementById('hustle-available-toggle'),
    hustleSort: root.getElementById('hustle-sort'),
    hustleList: root.getElementById('hustle-list')
  }),
  assetFilters: root => ({
    activeOnly: root.getElementById('venture-active-toggle'),
    maintenance: root.getElementById('venture-maintenance-toggle'),
    lowRisk: root.getElementById('venture-risk-toggle')
  }),
  assetGallery: root => root.getElementById('venture-gallery'),
  upgradeFilters: root => ({
    unlocked: root.getElementById('upgrade-unlocked-toggle')
  }),
  upgradeOverview: root => ({
    container: root.getElementById('upgrade-overview'),
    purchased: root.getElementById('upgrade-overview-owned'),
    ready: root.getElementById('upgrade-overview-ready'),
    note: root.getElementById('upgrade-overview-note')
  }),
  upgradeEmpty: root => root.getElementById('upgrade-empty'),
  upgradeLaneList: root => root.getElementById('upgrade-lane-list'),
  upgradeList: root => root.getElementById('upgrade-list'),
  upgradeDockList: root => root.getElementById('upgrade-dock-list'),
  studyFilters: root => ({
    activeOnly: root.getElementById('study-active-toggle'),
    hideComplete: root.getElementById('study-hide-complete')
  }),
  studyQueue: root => ({
    list: root.getElementById('study-queue-list'),
    eta: root.getElementById('study-queue-eta'),
    cap: root.getElementById('study-queue-cap')
  }),
  studyTrackList: root => root.getElementById('study-track-list'),
  slideOver: root => ({
    slideOver: root.getElementById('slide-over'),
    slideOverBackdrop: root.querySelector('#slide-over .slide-over__backdrop'),
    slideOverClose: root.getElementById('slide-over-close'),
    slideOverTitle: root.getElementById('slide-over-title'),
    slideOverEyebrow: root.getElementById('slide-over-eyebrow'),
    slideOverContent: root.getElementById('slide-over-content')
  }),
  commandPalette: root => ({
    commandPalette: root.getElementById('command-palette'),
    commandPaletteTrigger: root.getElementById('command-palette-trigger'),
    commandPaletteBackdrop: root.querySelector('#command-palette .command-palette__backdrop'),
    commandPaletteSearch: root.getElementById('command-palette-search'),
    commandPaletteResults: root.getElementById('command-palette-results')
  }),
  playerNodes: root => ({
    summary: {
      tier: root.getElementById('player-summary-tier'),
      note: root.getElementById('player-summary-note'),
      money: root.getElementById('player-summary-money'),
      earned: root.getElementById('player-summary-earned'),
      spent: root.getElementById('player-summary-spent'),
      day: root.getElementById('player-summary-day'),
      time: root.getElementById('player-summary-time')
    },
    skills: {
      list: root.getElementById('player-skills-list'),
      summary: root.getElementById('player-skills-summary')
    },
    educationList: root.getElementById('player-education-list'),
    equipmentList: root.getElementById('player-equipment-list'),
    statsList: root.getElementById('player-stats-list')
  }),
  debugCatalog: root => ({
    debugActionCatalog: root.getElementById('debug-action-catalog'),
    debugActionCatalogList: root.getElementById('debug-action-catalog-list'),
    debugActionCatalogSummary: root.getElementById('debug-action-catalog-summary')
  })
};

export { resolvers as classicResolvers };
export default resolvers;
