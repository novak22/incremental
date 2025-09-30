const DEFAULT_DOCUMENT = typeof document !== 'undefined' ? document : null;

class ElementRegistry {
  constructor(root = DEFAULT_DOCUMENT) {
    this.document = root;
    this.cache = new Map();
  }

  initialize(root = DEFAULT_DOCUMENT) {
    this.document = root;
    this.cache.clear();
  }

  getRoot() {
    return this.document || DEFAULT_DOCUMENT;
  }

  resolve(key, resolver) {
    if (!this.cache.has(key)) {
      const root = this.getRoot();
      this.cache.set(key, root ? resolver(root) : null);
    }
    return this.cache.get(key);
  }

  getMoneyNode() {
    return this.resolve('money', root => root.getElementById('money'));
  }

  getSessionStatusNode() {
    return this.resolve('sessionStatus', root => root.getElementById('session-status'));
  }

  getHeaderActionButtons() {
    return this.resolve('headerActionButtons', root => ({
      endDayButton: root.getElementById('end-day'),
      autoForwardButton: root.getElementById('auto-forward')
    }));
  }

  getShellNavigation() {
    return this.resolve('shellNavigation', root => ({
      shellTabs: Array.from(root.querySelectorAll('.shell__tab')),
      panels: Array.from(root.querySelectorAll('.panel'))
    }));
  }

  getHeaderStats() {
    return this.resolve('headerStats', root => ({
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
    }));
  }

  getKpiNodes() {
    return this.resolve('kpis', root => ({
      cash: root.getElementById('kpi-cash'),
      net: root.getElementById('kpi-net'),
      hours: root.getElementById('kpi-hours'),
      upkeep: root.getElementById('kpi-upkeep'),
      assets: root.getElementById('kpi-assets'),
      study: root.getElementById('kpi-study')
    }));
  }

  getKpiNotes() {
    return this.resolve('kpiNotes', root => ({
      cash: root.getElementById('kpi-cash-note'),
      net: root.getElementById('kpi-net-note'),
      hours: root.getElementById('kpi-hours-note'),
      upkeep: root.getElementById('kpi-upkeep-note'),
      assets: root.getElementById('kpi-assets-note'),
      study: root.getElementById('kpi-study-note')
    }));
  }

  getKpiValues() {
    return this.resolve('kpiValues', root => ({
      net: root.getElementById('kpi-net-value'),
      hours: root.getElementById('kpi-hours-value'),
      upkeep: root.getElementById('kpi-upkeep-value'),
      assets: root.getElementById('kpi-assets-value'),
      study: root.getElementById('kpi-study-value')
    }));
  }

  getDailyStats() {
    return this.resolve('dailyStats', root => ({
      timeSummary: root.getElementById('daily-time-summary'),
      timeList: root.getElementById('daily-time-list'),
      earningsSummary: root.getElementById('daily-earnings-summary'),
      earningsActive: root.getElementById('daily-earnings-active'),
      earningsPassive: root.getElementById('daily-earnings-passive'),
      spendSummary: root.getElementById('daily-spend-summary'),
      spendList: root.getElementById('daily-spend-list'),
      studySummary: root.getElementById('daily-study-summary'),
      studyList: root.getElementById('daily-study-list')
    }));
  }

  getNicheTrends() {
    return this.resolve('nicheTrends', root => ({
      highlightHot: root.getElementById('analytics-highlight-hot'),
      highlightHotNote: root.getElementById('analytics-highlight-hot-note'),
      highlightSwing: root.getElementById('analytics-highlight-swing'),
      highlightSwingNote: root.getElementById('analytics-highlight-swing-note'),
      highlightRisk: root.getElementById('analytics-highlight-risk'),
      highlightRiskNote: root.getElementById('analytics-highlight-risk-note'),
      highlightMiss: root.getElementById('analytics-highlight-miss'),
      highlightMissNote: root.getElementById('analytics-highlight-miss-note'),
      board: root.getElementById('niche-board'),
      sortButtons: Array.from(root.querySelectorAll('[data-niche-sort]')),
      filterInvested: root.getElementById('niche-filter-invested'),
      filterWatchlist: root.getElementById('niche-filter-watchlist')
    }));
  }

  getSkillSections() {
    return this.resolve('skillSections', root => ({
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
    }));
  }

  getQueueNodes() {
    return this.resolve('queueNodes', root => ({
      actionQueue: root.getElementById('action-queue'),
      queuePause: root.getElementById('queue-pause'),
      queueCancel: root.getElementById('queue-cancel')
    }));
  }

  getQuickActionsContainer() {
    return this.resolve('quickActions', root => root.getElementById('quick-actions'));
  }

  getAssetUpgradeActionsContainer() {
    return this.resolve('assetUpgradeActions', root => root.getElementById('asset-upgrade-actions'));
  }

  getNotificationsContainer() {
    return this.resolve('notifications', root => root.getElementById('notification-list'));
  }

  getEventLogPreviewNode() {
    return this.resolve('eventLogPreview', root => root.getElementById('event-log-preview'));
  }

  getEventLogControls() {
    return this.resolve('eventLogControls', root => ({
      openEventLog: root.getElementById('open-event-log'),
      eventLogPanel: root.getElementById('event-log-panel'),
      eventLogClose: root.getElementById('event-log-close')
    }));
  }

  getLogNodes() {
    return this.resolve('logNodes', root => ({
      logFeed: root.getElementById('log-feed'),
      logTemplate: root.getElementById('log-template'),
      logTip: root.getElementById('log-tip')
    }));
  }

  getHustleControls() {
    return this.resolve('hustleControls', root => ({
      hustleSearch: root.getElementById('hustle-search'),
      hustleCategoryChips: root.getElementById('hustle-category-chips'),
      hustleRequirementChips: root.getElementById('hustle-req-chips'),
      hustleAvailableToggle: root.getElementById('hustle-available-toggle'),
      hustleSort: root.getElementById('hustle-sort'),
      hustleList: root.getElementById('hustle-list')
    }));
  }

  getAssetFilters() {
    return this.resolve('assetFilters', root => ({
      activeOnly: root.getElementById('asset-active-toggle'),
      maintenance: root.getElementById('asset-maintenance-toggle'),
      lowRisk: root.getElementById('asset-risk-toggle')
    }));
  }

  getAssetGallery() {
    return this.resolve('assetGallery', root => root.getElementById('asset-gallery'));
  }

  getUpgradeFilters() {
    return this.resolve('upgradeFilters', root => ({
      unlocked: root.getElementById('upgrade-unlocked-toggle')
    }));
  }

  getUpgradeOverview() {
    return this.resolve('upgradeOverview', root => ({
      container: root.getElementById('upgrade-overview'),
      purchased: root.getElementById('upgrade-overview-owned'),
      ready: root.getElementById('upgrade-overview-ready'),
      note: root.getElementById('upgrade-overview-note')
    }));
  }

  getUpgradeEmptyNode() {
    return this.resolve('upgradeEmpty', root => root.getElementById('upgrade-empty'));
  }

  getUpgradeLaneList() {
    return this.resolve('upgradeLaneList', root => root.getElementById('upgrade-lane-list'));
  }

  getUpgradeList() {
    return this.resolve('upgradeList', root => root.getElementById('upgrade-list'));
  }

  getUpgradeDockList() {
    return this.resolve('upgradeDockList', root => root.getElementById('upgrade-dock-list'));
  }

  getStudyFilters() {
    return this.resolve('studyFilters', root => ({
      activeOnly: root.getElementById('study-active-toggle'),
      hideComplete: root.getElementById('study-hide-complete')
    }));
  }

  getStudyQueue() {
    return this.resolve('studyQueue', root => ({
      list: root.getElementById('study-queue-list'),
      eta: root.getElementById('study-queue-eta'),
      cap: root.getElementById('study-queue-cap')
    }));
  }

  getStudyTrackList() {
    return this.resolve('studyTrackList', root => root.getElementById('study-track-list'));
  }

  getSlideOverNodes() {
    return this.resolve('slideOver', root => ({
      slideOver: root.getElementById('slide-over'),
      slideOverBackdrop: root.querySelector('#slide-over .slide-over__backdrop'),
      slideOverClose: root.getElementById('slide-over-close'),
      slideOverTitle: root.getElementById('slide-over-title'),
      slideOverEyebrow: root.getElementById('slide-over-eyebrow'),
      slideOverContent: root.getElementById('slide-over-content')
    }));
  }

  getCommandPaletteNodes() {
    return this.resolve('commandPalette', root => ({
      commandPalette: root.getElementById('command-palette'),
      commandPaletteTrigger: root.getElementById('command-palette-trigger'),
      commandPaletteBackdrop: root.querySelector('#command-palette .command-palette__backdrop'),
      commandPaletteSearch: root.getElementById('command-palette-search'),
      commandPaletteResults: root.getElementById('command-palette-results')
    }));
  }

  getPlayerNodes() {
    return this.resolve('playerNodes', root => ({
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
    }));
  }

  getDebugCatalogNodes() {
    return this.resolve('debugCatalog', root => ({
      debugActionCatalog: root.getElementById('debug-action-catalog'),
      debugActionCatalogList: root.getElementById('debug-action-catalog-list'),
      debugActionCatalogSummary: root.getElementById('debug-action-catalog-summary')
    }));
  }
}

const elementRegistry = new ElementRegistry();

export function initElementRegistry(root) {
  elementRegistry.initialize(root);
}

export function getMoneyNode() {
  return elementRegistry.getMoneyNode();
}

export function getSessionStatusNode() {
  return elementRegistry.getSessionStatusNode();
}

export function getHeaderActionButtons() {
  return elementRegistry.getHeaderActionButtons();
}

export function getShellNavigation() {
  return elementRegistry.getShellNavigation();
}

export function getHeaderStats() {
  return elementRegistry.getHeaderStats();
}

export function getKpiNodes() {
  return elementRegistry.getKpiNodes();
}

export function getKpiNotes() {
  return elementRegistry.getKpiNotes();
}

export function getKpiValues() {
  return elementRegistry.getKpiValues();
}

export function getDailyStats() {
  return elementRegistry.getDailyStats();
}

export function getNicheTrends() {
  return elementRegistry.getNicheTrends();
}

export function getSkillSections() {
  return elementRegistry.getSkillSections();
}

export function getQueueNodes() {
  return elementRegistry.getQueueNodes();
}

export function getQuickActionsContainer() {
  return elementRegistry.getQuickActionsContainer();
}

export function getAssetUpgradeActionsContainer() {
  return elementRegistry.getAssetUpgradeActionsContainer();
}

export function getNotificationsContainer() {
  return elementRegistry.getNotificationsContainer();
}

export function getEventLogPreviewNode() {
  return elementRegistry.getEventLogPreviewNode();
}

export function getEventLogControls() {
  return elementRegistry.getEventLogControls();
}

export function getLogNodes() {
  return elementRegistry.getLogNodes();
}

export function getHustleControls() {
  return elementRegistry.getHustleControls();
}

export function getAssetFilters() {
  return elementRegistry.getAssetFilters();
}

export function getAssetGallery() {
  return elementRegistry.getAssetGallery();
}

export function getUpgradeFilters() {
  return elementRegistry.getUpgradeFilters();
}

export function getUpgradeOverview() {
  return elementRegistry.getUpgradeOverview();
}

export function getUpgradeEmptyNode() {
  return elementRegistry.getUpgradeEmptyNode();
}

export function getUpgradeLaneList() {
  return elementRegistry.getUpgradeLaneList();
}

export function getUpgradeList() {
  return elementRegistry.getUpgradeList();
}

export function getUpgradeDockList() {
  return elementRegistry.getUpgradeDockList();
}

export function getStudyFilters() {
  return elementRegistry.getStudyFilters();
}

export function getStudyQueue() {
  return elementRegistry.getStudyQueue();
}

export function getStudyTrackList() {
  return elementRegistry.getStudyTrackList();
}

export function getSlideOverNodes() {
  return elementRegistry.getSlideOverNodes();
}

export function getCommandPaletteNodes() {
  return elementRegistry.getCommandPaletteNodes();
}

export function getPlayerNodes() {
  return elementRegistry.getPlayerNodes();
}

export function getDebugCatalogNodes() {
  return elementRegistry.getDebugCatalogNodes();
}

export default elementRegistry;
