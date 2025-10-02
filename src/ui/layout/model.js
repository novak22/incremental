const defaultPreferences = {
  hustles: {
    availableOnly: false,
    sort: 'roi',
    query: ''
  },
  assets: {
    activeOnly: false,
    maintenanceOnly: false,
    hideHighRisk: false
  },
  upgrades: {
    readyOnly: true
  },
  study: {
    activeOnly: false,
    hideComplete: false
  }
};

const preferences = {
  hustles: { ...defaultPreferences.hustles },
  assets: { ...defaultPreferences.assets },
  upgrades: { ...defaultPreferences.upgrades },
  study: { ...defaultPreferences.study }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSort(value) {
  return ['roi', 'payout', 'time'].includes(value) ? value : 'roi';
}

function normalizeString(value) {
  return typeof value === 'string' ? value : '';
}

function buildHustleLayoutModel(models = [], prefs = preferences.hustles) {
  const query = normalizeString(prefs.query).trim().toLowerCase();
  const availableOnly = Boolean(prefs.availableOnly);
  const sort = normalizeSort(prefs.sort);

  const entries = (Array.isArray(models) ? models : []).map(model => {
    const filters = model?.filters || {};
    const metrics = model?.metrics || {};
    const roi = Number(metrics?.roi) || 0;
    const payout = Number(metrics?.payout?.value) || 0;
    const time = Number(metrics?.time?.value) || 0;
    const available = Boolean(filters.available);
    const search = normalizeString(filters.search).toLowerCase();
    const matchesAvailability = !availableOnly || available;
    const matchesSearch = !query || search.includes(query);
    return {
      id: model?.id,
      available,
      matchesAvailability,
      matchesSearch,
      roi,
      payout,
      time
    };
  });

  const comparatorMap = {
    roi: (a, b) => b.roi - a.roi,
    payout: (a, b) => b.payout - a.payout,
    time: (a, b) => a.time - b.time
  };
  const primaryComparator = comparatorMap[sort] || comparatorMap.roi;
  const payoutComparator = comparatorMap.payout;

  const visibleEntries = entries
    .filter(entry => entry.matchesAvailability && entry.matchesSearch && entry.id)
    .sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      if (a.available) {
        const primary = primaryComparator(a, b);
        if (primary !== 0) return primary;
        return payoutComparator(a, b);
      }
      const fallback = payoutComparator(a, b);
      if (fallback !== 0) return fallback;
      return primaryComparator(a, b);
    });

  const orderedIds = visibleEntries.map(entry => entry.id);
  const hiddenIds = entries
    .filter(entry => !(entry.matchesAvailability && entry.matchesSearch) && entry.id)
    .map(entry => entry.id);

  return {
    orderedIds,
    hiddenIds,
    preferences: { ...prefs }
  };
}

function collectAssetInstances(models = {}) {
  const groups = Array.isArray(models?.groups) ? models.groups : [];
  const instances = [];
  groups.forEach(group => {
    (group?.instances || []).forEach(instance => {
      if (!instance) return;
      const filters = instance.filters || {};
      const id = instance.id || instance.instance?.id || instance.definitionId;
      instances.push({
        id,
        status: filters.status || instance.status || 'setup',
        needsMaintenance: Boolean(filters.needsMaintenance || instance.needsMaintenance),
        risk: filters.risk || instance.risk || 'medium'
      });
    });
  });
  return instances;
}

function buildAssetLayoutModel(models = {}, prefs = preferences.assets) {
  const activeOnly = Boolean(prefs.activeOnly);
  const maintenanceOnly = Boolean(prefs.maintenanceOnly);
  const hideHighRisk = Boolean(prefs.hideHighRisk);

  const instances = collectAssetInstances(models);
  const visibleIds = [];
  const hiddenIds = [];

  instances.forEach(instance => {
    if (!instance?.id) return;
    let hidden = false;
    if (activeOnly && instance.status !== 'active') hidden = true;
    if (maintenanceOnly && !instance.needsMaintenance) hidden = true;
    if (hideHighRisk && instance.risk === 'high') hidden = true;
    if (hidden) {
      hiddenIds.push(instance.id);
    } else {
      visibleIds.push(instance.id);
    }
  });

  return {
    visibleIds,
    hiddenIds,
    preferences: { ...prefs }
  };
}

function collectUpgradeDefinitions(models = {}) {
  const categories = Array.isArray(models?.categories) ? models.categories : [];
  const definitions = [];
  categories.forEach(category => {
    (category?.families || []).forEach(family => {
      (family?.definitions || []).forEach(definition => {
        if (definition?.id) {
          definitions.push({
            id: definition.id,
            ready: Boolean(definition?.filters?.ready)
          });
        }
      });
    });
  });
  return definitions;
}

function buildUpgradeLayoutModel(models = {}, prefs = preferences.upgrades) {
  const readyOnly = prefs.readyOnly !== false;
  const definitions = collectUpgradeDefinitions(models);
  const hiddenIds = [];
  const visibleIds = [];

  definitions.forEach(definition => {
    if (!definition?.id) return;
    const matches = !readyOnly || definition.ready;
    if (matches) {
      visibleIds.push(definition.id);
    } else {
      hiddenIds.push(definition.id);
    }
  });

  return {
    visibleIds,
    hiddenIds,
    preferences: { ...prefs }
  };
}

function buildStudyLayoutModel(models = {}, prefs = preferences.study) {
  const activeOnly = Boolean(prefs.activeOnly);
  const hideComplete = Boolean(prefs.hideComplete);
  const tracks = Array.isArray(models?.tracks) ? models.tracks : [];
  const visibleIds = [];
  const hiddenIds = [];

  tracks.forEach(track => {
    if (!track?.id) return;
    const filters = track.filters || {};
    const isActive = Boolean(filters.active);
    const isComplete = Boolean(filters.completed);
    let hidden = false;
    if (activeOnly && !isActive) hidden = true;
    if (hideComplete && isComplete) hidden = true;
    if (hidden) {
      hiddenIds.push(track.id);
    } else {
      visibleIds.push(track.id);
    }
  });

  return {
    visibleIds,
    hiddenIds,
    preferences: { ...prefs }
  };
}

export function getLayoutPreferences() {
  return clone(preferences);
}

export function updateLayoutPreferences(section, patch = {}) {
  if (!preferences[section]) {
    return getLayoutPreferences();
  }

  if (section === 'hustles') {
    const next = {
      ...preferences.hustles,
      ...patch,
      sort: normalizeSort(patch.sort ?? preferences.hustles.sort),
      query: normalizeString(patch.query ?? preferences.hustles.query)
    };
    next.availableOnly = Boolean(patch.availableOnly ?? next.availableOnly);
    preferences.hustles = next;
  } else if (section === 'assets') {
    const next = {
      ...preferences.assets,
      ...patch
    };
    next.activeOnly = Boolean(patch.activeOnly ?? next.activeOnly);
    next.maintenanceOnly = Boolean(patch.maintenanceOnly ?? next.maintenanceOnly);
    next.hideHighRisk = Boolean(patch.hideHighRisk ?? next.hideHighRisk);
    preferences.assets = next;
  } else if (section === 'upgrades') {
    const next = {
      ...preferences.upgrades,
      ...patch
    };
    if (typeof patch.readyOnly === 'boolean') {
      next.readyOnly = patch.readyOnly;
    }
    preferences.upgrades = next;
  } else if (section === 'study') {
    const next = {
      ...preferences.study,
      ...patch
    };
    next.activeOnly = Boolean(patch.activeOnly ?? next.activeOnly);
    next.hideComplete = Boolean(patch.hideComplete ?? next.hideComplete);
    preferences.study = next;
  }

  return getLayoutPreferences();
}

export function buildLayoutModel(models = {}) {
  return {
    hustles: buildHustleLayoutModel(models?.hustles, preferences.hustles),
    assets: buildAssetLayoutModel(models?.assets, preferences.assets),
    upgrades: buildUpgradeLayoutModel(models?.upgrades, preferences.upgrades),
    study: buildStudyLayoutModel(models?.education, preferences.study)
  };
}

export default buildLayoutModel;
