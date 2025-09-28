const elements = {
  money: document.getElementById('money'),
  time: document.getElementById('time'),
  timeProgress: document.getElementById('time-progress'),
  day: document.getElementById('day'),
  logFeed: document.getElementById('log-feed'),
  logTemplate: document.getElementById('log-template'),
  logTip: document.getElementById('log-tip'),
  hustleGrid: document.getElementById('hustle-grid'),
  educationGrid: document.getElementById('education-grid'),
  assetGridRoot: document.getElementById('asset-grid'),
  assetCategoryGrids: {
    foundation: document.getElementById('asset-grid-foundation'),
    creative: document.getElementById('asset-grid-creative'),
    commerce: document.getElementById('asset-grid-commerce'),
    advanced: document.getElementById('asset-grid-advanced')
  },
  assetCategoryLists: {
    foundation: document.getElementById('asset-list-foundation'),
    creative: document.getElementById('asset-list-creative'),
    commerce: document.getElementById('asset-list-commerce'),
    advanced: document.getElementById('asset-list-advanced')
  },
  assetCategoryToggles: {
    foundation: document.querySelector('[data-asset-category-toggle="foundation"]'),
    creative: document.querySelector('[data-asset-category-toggle="creative"]'),
    commerce: document.querySelector('[data-asset-category-toggle="commerce"]'),
    advanced: document.querySelector('[data-asset-category-toggle="advanced"]')
  },
  assetSection: document.getElementById('section-assets'),
  upgradeGrid: document.getElementById('upgrade-grid'),
  upgradeGroupGrids: {
    equipment: document.getElementById('upgrade-grid-equipment'),
    automation: document.getElementById('upgrade-grid-automation'),
    consumables: document.getElementById('upgrade-grid-consumables'),
    misc: document.getElementById('upgrade-grid')
  },
  endDayButton: document.getElementById('end-day'),
  summaryPanel: document.getElementById('stats-panel'),
  summaryTime: document.getElementById('summary-time'),
  summaryTimeCaption: document.getElementById('summary-time-caption'),
  summaryTimeBreakdown: document.getElementById('summary-time-breakdown'),
  summaryIncome: document.getElementById('summary-income'),
  summaryIncomeCaption: document.getElementById('summary-income-caption'),
  summaryIncomeBreakdown: document.getElementById('summary-income-breakdown'),
  summaryCost: document.getElementById('summary-cost'),
  summaryCostCaption: document.getElementById('summary-cost-caption'),
  summaryCostBreakdown: document.getElementById('summary-cost-breakdown'),
  summaryStudy: document.getElementById('summary-study'),
  summaryStudyCaption: document.getElementById('summary-study-caption'),
  summaryStudyBreakdown: document.getElementById('summary-study-breakdown'),
  statsToggle: document.getElementById('stats-toggle'),
  logToggle: document.getElementById('log-toggle'),
  sectionNavLinks: Array.from(document.querySelectorAll('.section-nav .section-link')),
  workspaceSections: Array.from(document.querySelectorAll('.workspace-section')),
  workspacePanels: document.getElementById('workspace-panels'),
  globalFilters: {
    hideLocked: document.getElementById('filter-hide-locked'),
    hideCompleted: document.getElementById('filter-hide-completed'),
    showActive: document.getElementById('filter-show-active')
  },
  hustlesFilters: {
    availableOnly: document.getElementById('filter-hustles-available')
  },
  educationFilters: {
    activeOnly: document.getElementById('filter-education-active'),
    hideComplete: document.getElementById('filter-education-hide-complete')
  },
  assetsFilters: {
    collapsed: document.getElementById('filter-assets-collapsed'),
    hideLocked: document.getElementById('filter-assets-hide-locked')
  },
  assetInfoTrigger: document.getElementById('asset-info-trigger'),
  assetInfoModal: document.getElementById('asset-info-modal'),
  assetInfoEyebrow: document.getElementById('asset-info-eyebrow'),
  assetInfoTitle: document.getElementById('asset-info-title'),
  assetInfoDescription: document.getElementById('asset-info-description'),
  assetInfoDetails: document.getElementById('asset-info-details'),
  assetInfoDefinition: document.getElementById('asset-info-definition'),
  assetInfoInstance: document.getElementById('asset-info-instance'),
  assetInfoInstanceStatus: document.getElementById('asset-info-instance-status'),
  assetInfoInstanceQuality: document.getElementById('asset-info-instance-quality'),
  assetInfoInstanceUpkeep: document.getElementById('asset-info-instance-upkeep'),
  assetInfoInstancePayout: document.getElementById('asset-info-instance-payout'),
  assetInfoInstanceRoi: document.getElementById('asset-info-instance-roi'),
  assetInfoQualityProgress: document.getElementById('asset-info-quality-progress'),
  assetInfoQualityActions: document.getElementById('asset-info-quality-actions'),
  assetInfoSupportUpgrades: document.getElementById('asset-info-support-upgrades'),
  assetInfoClose: document.getElementById('asset-info-close'),
  upgradeSearch: document.getElementById('upgrade-search'),
  debugActionCatalog: document.getElementById('debug-action-catalog'),
  debugActionCatalogSummary: document.getElementById('debug-action-catalog-summary'),
  debugActionCatalogList: document.getElementById('debug-action-catalog-list')
};

export default elements;
