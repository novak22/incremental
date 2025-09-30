const DEFAULT_DOCUMENT = typeof document !== 'undefined' ? document : null;

class ElementRegistry {
  constructor(root = DEFAULT_DOCUMENT, resolvers = {}) {
    this.document = root;
    this.resolvers = resolvers || {};
    this.cache = new Map();
  }

  initialize(root = DEFAULT_DOCUMENT, resolvers = this.resolvers) {
    this.document = root;
    this.resolvers = resolvers || {};
    this.cache.clear();
  }

  getRoot() {
    return this.document || DEFAULT_DOCUMENT;
  }

  resolve(key) {
    if (!this.cache.has(key)) {
      const resolver = this.resolvers?.[key];
      const root = this.getRoot();
      const value = resolver && root ? resolver(root) : null;
      this.cache.set(key, value);
    }
    return this.cache.get(key);
  }

  getMoneyNode() {
    return this.resolve('money');
  }

  getSessionStatusNode() {
    return this.resolve('sessionStatus');
  }

  getHeaderActionButtons() {
    return this.resolve('headerActionButtons');
  }

  getShellNavigation() {
    return this.resolve('shellNavigation');
  }

  getHeaderStats() {
    return this.resolve('headerStats');
  }

  getKpiNodes() {
    return this.resolve('kpis');
  }

  getKpiNotes() {
    return this.resolve('kpiNotes');
  }

  getKpiValues() {
    return this.resolve('kpiValues');
  }

  getDailyStats() {
    return this.resolve('dailyStats');
  }

  getNicheTrends() {
    return this.resolve('nicheTrends');
  }

  getSkillSections() {
    return this.resolve('skillSections');
  }

  getQueueNodes() {
    return this.resolve('queueNodes');
  }

  getQuickActionsContainer() {
    return this.resolve('quickActions');
  }

  getAssetUpgradeActionsContainer() {
    return this.resolve('assetUpgradeActions');
  }

  getNotificationsContainer() {
    return this.resolve('notifications');
  }

  getEventLogPreviewNode() {
    return this.resolve('eventLogPreview');
  }

  getEventLogControls() {
    return this.resolve('eventLogControls');
  }

  getLogNodes() {
    return this.resolve('logNodes');
  }

  getHustleControls() {
    return this.resolve('hustleControls');
  }

  getAssetFilters() {
    return this.resolve('assetFilters');
  }

  getAssetGallery() {
    return this.resolve('assetGallery');
  }

  getUpgradeFilters() {
    return this.resolve('upgradeFilters');
  }

  getUpgradeOverview() {
    return this.resolve('upgradeOverview');
  }

  getUpgradeEmptyNode() {
    return this.resolve('upgradeEmpty');
  }

  getUpgradeLaneList() {
    return this.resolve('upgradeLaneList');
  }

  getUpgradeList() {
    return this.resolve('upgradeList');
  }

  getUpgradeDockList() {
    return this.resolve('upgradeDockList');
  }

  getStudyFilters() {
    return this.resolve('studyFilters');
  }

  getStudyQueue() {
    return this.resolve('studyQueue');
  }

  getStudyTrackList() {
    return this.resolve('studyTrackList');
  }

  getSlideOverNodes() {
    return this.resolve('slideOver');
  }

  getCommandPaletteNodes() {
    return this.resolve('commandPalette');
  }

  getPlayerNodes() {
    return this.resolve('playerNodes');
  }

  getDebugCatalogNodes() {
    return this.resolve('debugCatalog');
  }
}

const elementRegistry = new ElementRegistry();

export function initElementRegistry(root, resolvers) {
  elementRegistry.initialize(root, resolvers);
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
