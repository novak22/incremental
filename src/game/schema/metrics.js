const METRIC_TYPES = ['time', 'payout', 'cost'];

function ensureObject(target, key) {
  if (!target[key]) {
    target[key] = {};
  }
  return target[key];
}

function createAssetMetricId(definitionId, scope, type) {
  if (scope === 'sale' && type === 'payout') {
    return `asset:${definitionId}:sale`;
  }
  const suffix = type === 'payout' ? 'payout' : type;
  return `asset:${definitionId}:${scope}-${suffix}`;
}

function createQualityMetricId(definitionId, actionId, type) {
  const suffix = type === 'payout' ? 'payout' : type;
  return `asset:${definitionId}:quality:${actionId}:${suffix}`;
}

function createActionMetricId(definitionId, type) {
  const suffix = type === 'payout' ? 'payout' : type;
  return `hustle:${definitionId}:${suffix}`;
}

function registerMetric(index, metricId, definition, category, metricType) {
  if (!metricId || index.has(metricId)) return;
  const label = definition.singular || definition.name || definition.id;
  index.set(metricId, {
    id: definition.id,
    type: definition.kind || 'asset',
    name: definition.name || label,
    label,
    category,
    metricType
  });
}

function attachActionMetricIds(definition) {
  if (!definition || !definition.id) return definition;
  const metricIds = { ...(definition.metricIds || {}) };
  for (const type of METRIC_TYPES) {
    const key = createActionMetricId(definition.id, type);
    if (!metricIds[type]) {
      metricIds[type] = key;
    }
  }
  definition.metricIds = metricIds;
  if (definition.action) {
    definition.action.metricIds = { ...(definition.action.metricIds || {}), ...metricIds };
  }
  definition.kind = definition.kind || 'hustle';
  return definition;
}

function attachAssetMetricIds(definition) {
  if (!definition || !definition.id) return definition;
  const metricIds = { ...(definition.metricIds || {}) };
  const setup = ensureObject(metricIds, 'setup');
  setup.time = setup.time || createAssetMetricId(definition.id, 'setup', 'time');
  setup.cost = setup.cost || createAssetMetricId(definition.id, 'setup', 'cost');

  const maintenance = ensureObject(metricIds, 'maintenance');
  maintenance.time = maintenance.time || createAssetMetricId(definition.id, 'maintenance', 'time');
  maintenance.cost = maintenance.cost || createAssetMetricId(definition.id, 'maintenance', 'cost');

  const payout = ensureObject(metricIds, 'payout');
  payout.payout = payout.payout || `asset:${definition.id}:payout`;

  const sale = ensureObject(metricIds, 'sale');
  sale.payout = sale.payout || createAssetMetricId(definition.id, 'sale', 'payout');

  if (definition.quality?.actions?.length) {
    const quality = ensureObject(metricIds, 'quality');
    for (const action of definition.quality.actions) {
      if (!action?.id) continue;
      const actionMetrics = quality[action.id] ? { ...quality[action.id] } : {};
      if (!actionMetrics.time) {
        actionMetrics.time = createQualityMetricId(definition.id, action.id, 'time');
      }
      if (!actionMetrics.cost) {
        actionMetrics.cost = createQualityMetricId(definition.id, action.id, 'cost');
      }
      quality[action.id] = actionMetrics;
      action.metricIds = { ...(action.metricIds || {}), ...actionMetrics };
    }
  }

  definition.metricIds = metricIds;
  definition.kind = definition.kind || 'asset';
  return definition;
}

export function attachRegistryMetricIds({ actions = [], hustles = [], assets = [], upgrades = [] }) {
  const actionDefinitions = Array.isArray(actions) && actions.length ? actions : hustles;
  actionDefinitions.forEach(attachActionMetricIds);
  assets.forEach(attachAssetMetricIds);
  upgrades.forEach(definition => {
    if (definition) {
      definition.metricIds = definition.metricIds || {};
      definition.kind = definition.kind || 'upgrade';
    }
  });
  return { actions: actionDefinitions, hustles, assets, upgrades };
}

export function buildMetricIndex({ actions = [], hustles = [], assets = [], upgrades = [] }) {
  const index = new Map();

  const actionDefinitions = Array.isArray(actions) && actions.length ? actions : hustles;

  for (const action of actionDefinitions) {
    if (!action) continue;
    const metricIds = action.metricIds || {};
    registerMetric(index, metricIds.time, action, 'action', 'time');
    registerMetric(index, metricIds.payout, action, 'action', 'payout');
    registerMetric(index, metricIds.cost, action, 'action', 'cost');
  }

  for (const asset of assets) {
    if (!asset) continue;
    const metricIds = asset.metricIds || {};
    const setup = metricIds.setup || {};
    registerMetric(index, setup.time, asset, 'setup', 'time');
    registerMetric(index, setup.cost, asset, 'setup', 'cost');

    const maintenance = metricIds.maintenance || {};
    registerMetric(index, maintenance.time, asset, 'maintenance', 'time');
    registerMetric(index, maintenance.cost, asset, 'maintenance', 'cost');

    const payout = metricIds.payout || {};
    registerMetric(index, payout.payout, asset, 'payout', 'payout');

    const sale = metricIds.sale || {};
    registerMetric(index, sale.payout, asset, 'sale', 'payout');

    const quality = metricIds.quality || {};
    Object.entries(quality).forEach(([actionId, actionMetrics]) => {
      if (!actionMetrics) return;
      registerMetric(index, actionMetrics.time, asset, `quality:${actionId}`, 'time');
      registerMetric(index, actionMetrics.cost, asset, `quality:${actionId}`, 'cost');
    });
  }

  for (const upgrade of upgrades) {
    if (!upgrade) continue;
    const metricIds = upgrade.metricIds || {};
    registerMetric(index, metricIds.time, upgrade, 'upgrade', 'time');
    registerMetric(index, metricIds.payout, upgrade, 'upgrade', 'payout');
    registerMetric(index, metricIds.cost, upgrade, 'upgrade', 'cost');
  }

  return index;
}
