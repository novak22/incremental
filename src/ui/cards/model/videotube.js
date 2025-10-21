import { ensureArray, formatMoney } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import { getQualityActions } from '../../../game/assets/quality/actions.js';
import { getInstanceQualityRange, getQualityLevel } from '../../../game/assets/quality/levels.js';
import { setAssetInstanceName } from '../../../game/assets/actions.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  clampNumber,
  buildActionSnapshot,
  buildMilestoneProgress
} from './sharedQuality.js';
import { filterUpgradeDefinitions, getUpgradeSnapshot, describeUpgradeStatus } from './upgrades.js';
import {
  calculateAveragePayout,
  describeInstanceStatus,
  estimateLifetimeSpend,
  buildPayoutBreakdown,
  mapNicheOptions,
  buildDefaultSummary
} from './sharedAssetInstances.js';
import { formatLabelFromKey } from '../utils.js';

function formatCurrency(amount) {
  return `$${formatMoney(Math.max(0, Math.round(Number(amount) || 0)))}`;
}
function computeRoi(lifetimeIncome, lifetimeSpend) {
  const income = Math.max(0, clampNumber(lifetimeIncome));
  const spend = Math.max(0, clampNumber(lifetimeSpend));
  if (spend <= 0) return null;
  return (income - spend) / spend;
}

const VIDEO_UPGRADE_FAMILY_ORDER = [
  'camera',
  'audio',
  'lighting',
  'studio',
  'phone',
  'pc',
  'monitor',
  'storage',
  'workflow',
  'internet',
  'power_backup',
  'general'
];

const VIDEO_UPGRADE_FAMILY_COPY = {
  camera: {
    title: 'Camera rigs',
    note: 'Sharpen every frame with cinema-ready lenses and stabilised mounts.',
    icon: '🎥'
  },
  audio: {
    title: 'Audio suite',
    note: 'Treat the studio for buttery vocals, crisp foley, and mix-ready masters.',
    icon: '🎙️'
  },
  lighting: {
    title: 'Lighting & mood',
    note: 'Dial in flattering lighting, diffusers, and on-set ambience.',
    icon: '💡'
  },
  studio: {
    title: 'Stage expansions',
    note: 'Expand sets, prop storage, and modular stages for versatile shoots.',
    icon: '🏗️'
  },
  phone: {
    title: 'Creator phones',
    note: 'Capture field footage and behind-the-scenes clips without missing a beat.',
    icon: '📱'
  },
  pc: {
    title: 'Editing bays',
    note: 'Workstations that chew through renders and marathon edit sessions.',
    icon: '🖥️'
  },
  monitor: {
    title: 'Color bays',
    note: 'Precision displays and arrays that make grading and review effortless.',
    icon: '🖼️'
  },
  storage: {
    title: 'Storage & scratch',
    note: 'High-speed arrays to safeguard footage and keep cache renders instant.',
    icon: '💾'
  },
  workflow: {
    title: 'Workflow suites',
    note: 'Automation and cross-channel rituals to keep every drop in sync.',
    icon: '🧠'
  },
  internet: {
    title: 'Bandwidth boosts',
    note: 'Fiber-fast plans to keep livestreams and uploads smooth.',
    icon: '🌐'
  },
  power_backup: {
    title: 'Power & uptime',
    note: 'Backups and surge protection to keep the studio humming.',
    icon: '🔋'
  },
  general: {
    title: 'Studio boosts',
    note: 'Miscellaneous treats that keep creators energised and efficient.',
    icon: '✨'
  }
};

const FEATURED_UPGRADE_FAMILIES = ['camera', 'audio', 'phone', 'storage'];

function describeVideoUpgradeOverview({ total, purchased, ready }) {
  if (!total) {
    return 'Studio upgrades unlock as your VideoTube channel grows.';
  }
  if (total === purchased) {
    return 'Every studio upgrade is owned — enjoy the glow up!';
  }
  if (ready > 0) {
    return ready === 1
      ? 'One upgrade is ready to install today.'
      : `${ready} upgrades are ready to install today.`;
  }
  return 'Keep stacking cash or clearing prerequisites to reveal your next gear boost.';
}

function getFamilyCopy(id) {
  if (VIDEO_UPGRADE_FAMILY_COPY[id]) {
    return VIDEO_UPGRADE_FAMILY_COPY[id];
  }
  const title = formatLabelFromKey(id, 'Studio boosts');
  return {
    title,
    note: 'Targeted boosts ready to power up your production pipeline.',
    icon: '✨'
  };
}

function buildVideoInstances(definition, state) {
  const assetState = getAssetState('vlog', state) || { instances: [] };
  const instances = ensureArray(assetState.instances);
  const actions = getQualityActions(definition);
  const maintenance = formatMaintenanceSummary(definition);
  const nicheOptions = mapNicheOptions(definition, state, { includeDelta: true });

  return instances.map((instance, index) => {
    const fallbackLabel = instanceLabel(definition, index);
    const customName = typeof instance.customName === 'string' && instance.customName.trim()
      ? instance.customName.trim()
      : '';
    const label = customName || fallbackLabel;
    const status = describeInstanceStatus(instance, definition);
    const averagePayout = calculateAveragePayout(instance, state);
    const qualityLevel = Math.max(0, clampNumber(instance?.quality?.level));
    const qualityInfo = getQualityLevel(definition, qualityLevel);
    const milestone = buildMilestoneProgress(definition, instance, {
      maxedSummary: 'Maxed out — production is at peak polish.',
      readySummary: 'No requirements — milestone ready to fire.'
    });
    const qualityRange = getInstanceQualityRange(definition, instance);
    const payoutBreakdown = buildPayoutBreakdown(instance);
    const actionSnapshots = actions.map(action => buildActionSnapshot(definition, instance, action, state, {
      limitReason: 'Daily limit hit — try again tomorrow.',
      inactiveCopy: remaining => remaining > 0
        ? `Launch wraps in ${remaining} day${remaining === 1 ? '' : 's'}`
        : 'Launch finishing up soon',
      decorate: ({ action: entry, instance: assetInstance, definition: assetDefinition, tracks }) => {
        const track = entry.progressKey ? tracks?.[entry.progressKey] : null;
        const rawAmount = typeof entry.progressAmount === 'function'
          ? entry.progressAmount({ definition: assetDefinition, instance: assetInstance })
          : Number(entry.progressAmount);
        const effectAmount = Number.isFinite(rawAmount) && rawAmount !== 0 ? rawAmount : 1;
        const effect = track
          ? `+${effectAmount} ${track.shortLabel || track.label}`
          : 'Boosts quality momentum';

        return {
          description: entry.description || '',
          effect
        };
      }
    }));
    const quickAction = actionSnapshots.find(entry => entry.available) || actionSnapshots[0] || null;
    const nicheInfo = getInstanceNicheInfo(instance, state);
    const niche = nicheInfo
      ? {
          id: nicheInfo.definition?.id || '',
          name: nicheInfo.definition?.name || nicheInfo.definition?.id || '',
          summary: nicheInfo.popularity?.summary || '',
          label: nicheInfo.popularity?.label || '',
          multiplier: nicheInfo.popularity?.multiplier || 1,
          score: clampNumber(nicheInfo.popularity?.score),
          delta: Number.isFinite(Number(nicheInfo.popularity?.delta))
            ? Number(nicheInfo.popularity.delta)
            : null
        }
      : null;

    const lifetimeIncome = Math.max(0, clampNumber(instance.totalIncome));
    const lifetimeSpend = estimateLifetimeSpend(definition, instance, state);
    const lifetimeNet = lifetimeIncome - lifetimeSpend;
    const createdOnDay = Math.max(0, clampNumber(instance?.createdOnDay));
    const currentDay = Math.max(1, clampNumber(state?.day) || 1);
    const daysActive = instance.status === 'active' && createdOnDay > 0
      ? Math.max(1, currentDay - createdOnDay + 1)
      : 0;

    return {
      id: instance.id,
      label,
      fallbackLabel,
      customName,
      status,
      latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
      averagePayout,
      lifetimeIncome,
      lifetimeSpend,
      lifetimeNet,
      roi: computeRoi(lifetimeIncome, lifetimeSpend),
      estimatedSpend: lifetimeSpend,
      maintenanceFunded: Boolean(instance.maintenanceFundedToday),
      pendingIncome: Math.max(0, clampNumber(instance.pendingIncome)),
      daysActive,
      qualityLevel,
      qualityInfo: qualityInfo || null,
      qualityRange,
      milestone,
      payoutBreakdown,
      actions: actionSnapshots,
      quickAction,
      niche,
      nicheLocked: Boolean(instance.nicheId),
      nicheOptions,
      maintenance,
      definition,
      instance
    };
  });
}

function buildStats(instances = []) {
  if (!instances.length) {
    return {
      lifetime: 0,
      daily: 0,
      active: 0,
      averageQuality: 0,
      milestonePercent: 0
    };
  }

  const lifetime = instances.reduce((sum, entry) => sum + (Number(entry.lifetimeIncome) || 0), 0);
  const daily = instances.reduce((sum, entry) => sum + (Number(entry.latestPayout) || 0), 0);
  const active = instances.filter(entry => entry.status?.id === 'active').length;
  const milestonePercent = instances.reduce((sum, entry) => sum + (Number(entry.milestone?.percent) || 0), 0) / instances.length;
  const maxLevel = instances.reduce((max, entry) => Math.max(max, Number(entry.definition?.quality?.levels?.length || 6) - 1), 0);
  const avgQualityRaw = instances.reduce((sum, entry) => sum + (Number(entry.qualityLevel) || 0), 0) / instances.length;
  const averageQuality = maxLevel > 0 ? Math.min(1, avgQualityRaw / maxLevel) : 0;

  return {
    lifetime,
    daily,
    active,
    averageQuality,
    milestonePercent
  };
}

function buildAnalytics(instances = []) {
  const byVideo = instances
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      lifetime: entry.lifetimeIncome,
      latest: entry.latestPayout,
      average: entry.averagePayout,
      roi: entry.roi,
      niche: entry.niche?.name || 'No niche',
      quality: entry.qualityLevel
    }))
    .sort((a, b) => b.lifetime - a.lifetime);

  const nicheMap = new Map();
  byVideo.forEach(entry => {
    const key = entry.niche || 'No niche';
    const existing = nicheMap.get(key) || { niche: key, lifetime: 0, daily: 0 };
    existing.lifetime += entry.lifetime;
    existing.daily += entry.latest;
    nicheMap.set(key, existing);
  });

  return {
    videos: byVideo,
    niches: Array.from(nicheMap.values()).sort((a, b) => b.lifetime - a.lifetime)
  };
}

function startVideoInstance(definition, options = {}, state = getState()) {
  if (!definition?.action?.onClick) return null;
  const before = new Set(
    ensureArray(getAssetState('vlog', state)?.instances).map(instance => instance?.id).filter(Boolean)
  );

  definition.action.onClick();

  const assetState = getAssetState('vlog');
  const afterInstances = ensureArray(assetState?.instances);
  const newInstance = afterInstances.find(instance => instance && !before.has(instance.id));
  if (!newInstance) {
    return null;
  }

  const name = typeof options.name === 'string' ? options.name.trim() : '';
  if (name) {
    setAssetInstanceName('vlog', newInstance.id, name);
  }
  if (options.nicheId) {
    assignInstanceToNiche('vlog', newInstance.id, options.nicheId);
  }

  return newInstance.id;
}

function buildVideoTubeUpgrades(upgradeDefinitions = [], state) {
  const definitions = filterUpgradeDefinitions(upgradeDefinitions, 'videotube');
  const stats = { total: 0, purchased: 0, ready: 0 };
  const groupsMap = new Map();
  const items = [];

  const ensureGroup = familyId => {
    const key = familyId || 'general';
    if (!groupsMap.has(key)) {
      const copy = getFamilyCopy(key);
      groupsMap.set(key, {
        id: key,
        title: copy.title,
        note: copy.note,
        icon: copy.icon,
        upgrades: [],
        ready: 0,
        owned: 0,
        total: 0
      });
    }
    return groupsMap.get(key);
  };

  definitions.forEach(definition => {
    const snapshot = getUpgradeSnapshot(definition, state);
    const upgrade = {
      id: definition.id,
      name: definition.name,
      cost: Math.max(0, clampNumber(definition.cost)),
      description: definition.description || '',
      tag: definition.tag || null,
      affects: definition.affects || {},
      effects: definition.effects || {},
      action: definition.action || null,
      definition,
      boosts: definition.boosts || '',
      snapshot,
      status: describeUpgradeStatus(snapshot),
      family: definition.family || 'general'
    };

    stats.total += 1;
    if (snapshot.purchased) stats.purchased += 1;
    if (snapshot.ready) stats.ready += 1;

    const group = ensureGroup(upgrade.family);
    group.upgrades.push(upgrade);
    group.total += 1;
    if (snapshot.ready) group.ready += 1;
    if (snapshot.purchased) group.owned += 1;

    items.push(upgrade);
  });

  const availableFamilies = Array.from(groupsMap.keys());
  const orderedFamilies = [
    ...VIDEO_UPGRADE_FAMILY_ORDER,
    ...availableFamilies.filter(id => !VIDEO_UPGRADE_FAMILY_ORDER.includes(id))
  ];
  const seen = new Set();
  const groups = orderedFamilies
    .filter(id => {
      if (seen.has(id)) return false;
      if (!groupsMap.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(id => {
      const entry = groupsMap.get(id);
      const upgrades = entry.upgrades
        .slice()
        .sort((a, b) => {
          const costDiff = (a.cost || 0) - (b.cost || 0);
          if (costDiff !== 0) return costDiff;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
      return {
        id: entry.id,
        title: entry.title,
        note: entry.note,
        icon: entry.icon,
        upgrades,
        ready: entry.ready,
        owned: entry.owned,
        total: entry.total
      };
    });

  const overview = {
    ...stats,
    note: describeVideoUpgradeOverview(stats)
  };

  if (!groups.length) {
    return { groups: [], overview, items: [] };
  }

  return { groups, overview, items };
}

function buildVideoUpgradeHighlights(upgradeData = {}) {
  const groups = ensureArray(upgradeData.groups);
  if (!groups.length) {
    return [];
  }
  const highlights = [];
  FEATURED_UPGRADE_FAMILIES.forEach(familyId => {
    const group = groups.find(entry => entry.id === familyId);
    if (!group) return;
    const upgrade = ensureArray(group.upgrades).find(entry => !entry.snapshot?.purchased) || group.upgrades[0];
    if (!upgrade) return;
    highlights.push({
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.boosts || upgrade.description || '',
      cost: upgrade.cost,
      familyId: group.id,
      familyTitle: group.title,
      status: upgrade.status,
      snapshot: upgrade.snapshot
    });
  });
  return highlights;
}

function buildVideoTubePricing(definition, upgradeData = {}, { nicheOptions = [] } = {}) {
  if (!definition) {
    return null;
  }

  const setup = {
    cost: Math.max(0, clampNumber(definition?.setup?.cost)),
    days: Math.max(0, clampNumber(definition?.setup?.days)),
    hoursPerDay: Math.max(0, clampNumber(definition?.setup?.hoursPerDay))
  };

  const maintenance = formatMaintenanceSummary(definition);
  const quality = definition?.quality || {};
  const levels = ensureArray(quality.levels)
    .map(level => ({
      level: clampNumber(level.level),
      name: level.name || `Quality ${level.level}`,
      description: level.description || '',
      income: {
        min: Math.max(0, clampNumber(level.income?.min ?? level.income?.low)),
        max: Math.max(0, clampNumber(level.income?.max ?? level.income?.high ?? level.income?.min))
      }
    }))
    .sort((a, b) => (a.level || 0) - (b.level || 0));

  const actions = ensureArray(quality.actions).map(action => ({
    id: action.id,
    label: action.label || 'Quality action',
    time: Math.max(0, clampNumber(action.time)),
    cost: Math.max(0, clampNumber(action.cost))
  }));

  const sortedNiches = ensureArray(nicheOptions)
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const gearHighlights = buildVideoUpgradeHighlights(upgradeData);

  return {
    summary: quality.summary || 'Map out quality tiers, action costs, and niche intel before filming.',
    setup,
    maintenance,
    levels,
    actions,
    gearHighlights,
    topNiches: sortedNiches.slice(0, 3),
    nicheCount: sortedNiches.length
  };
}

function createEmptyUpgradeData() {
  const stats = { total: 0, purchased: 0, ready: 0 };
  return {
    groups: [],
    items: [],
    overview: { ...stats, note: describeVideoUpgradeOverview(stats) }
  };
}

function buildVideoTubeModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'vlog') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, meta: 'VideoTube locked' },
      stats: { lifetime: 0, daily: 0, active: 0, averageQuality: 0, milestonePercent: 0 },
      analytics: { videos: [], niches: [] },
      launch: null,
      upgrades: createEmptyUpgradeData(),
      pricing: null
    };
  }

  const lock = buildSkillLock(state, 'videotube');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, meta: lock.meta },
      stats: { lifetime: 0, daily: 0, active: 0, averageQuality: 0, milestonePercent: 0 },
      analytics: { videos: [], niches: [] },
      launch: null,
      lock,
      upgrades: createEmptyUpgradeData(),
      pricing: null
    };
  }

  const instances = buildVideoInstances(definition, state);
  const summary = buildDefaultSummary(instances, {
    fallbackLabel: definition?.singular || 'video'
  });
  const stats = buildStats(instances);
  const analytics = buildAnalytics(instances);
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const defaultName = `Video #${instances.length + 1}`;
  const nicheOptions = mapNicheOptions(definition, state, { includeDelta: true });
  const maintenance = formatMaintenanceSummary(definition);
  const upgrades = buildVideoTubeUpgrades(upgradeDefinitions, state);
  const pricing = buildVideoTubePricing(definition, upgrades, { nicheOptions });

  const launch = launchAction
    ? {
        label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
        disabled: typeof launchAction.disabled === 'function'
          ? launchAction.disabled(state)
          : Boolean(launchAction.disabled),
        availability,
        setup: definition.setup || {},
        maintenance,
        defaultName,
        nicheOptions,
        create: options => startVideoInstance(definition, options, state)
      }
    : {
        label: 'Launch Video',
        disabled: availability.disabled,
        availability,
        setup: definition.setup || {},
        maintenance,
        defaultName,
        nicheOptions,
        create: () => null
      };

  return {
    definition,
    instances,
    summary,
    stats,
    analytics,
    launch,
    upgrades,
    pricing
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder(
  'videotube',
  (registries = {}, context = {}) =>
    buildVideoTubeModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
