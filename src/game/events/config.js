function getInstanceQualityLevel(instance) {
  return Number(instance?.quality?.level) || 0;
}

function randomBetween(min, max) {
  const low = Number(min);
  const high = Number(max);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return low || 0;
  }
  if (high <= low) return low;
  return low + Math.random() * (high - low);
}

export const ASSET_EVENT_BLUEPRINTS = [
  {
    id: 'asset:viralTrend',
    tone: 'positive',
    label: ({ definition }) => (definition.id === 'vlog' ? 'Viral surge' : 'Viral trend'),
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    canTrigger: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (definition.id === 'vlog') {
        return level >= 3;
      }
      return level >= 2;
    },
    chance: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (definition.id === 'vlog') {
        if (level < 3) return 0;
        return level >= 4 ? 0.24 : 0.18;
      }
      if (level < 2) return 0;
      const base = 0.08 + (level - 2) * 0.02;
      return Math.min(0.18, base);
    },
    duration: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (definition.id === 'vlog') {
        return level >= 4 ? 4 : 3;
      }
      return Math.max(2, Math.min(4, 2 + Math.floor(level / 2)));
    },
    initialPercent: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (definition.id === 'vlog') {
        return level >= 4 ? 2.5 : 2;
      }
      const min = 0.15 + level * 0.03;
      const max = 0.28 + level * 0.035;
      return randomBetween(min, max);
    },
    dailyPercentChange: ({ definition }) => {
      if (definition.id === 'vlog') {
        return -0.5;
      }
      return -0.05;
    }
  },
  {
    id: 'asset:platformSetback',
    tone: 'negative',
    label: ({ definition }) => {
      if (definition.id === 'vlog') return 'Algorithm slump';
      if (definition.id === 'dropshipping') return 'Logistics hiccup';
      if (definition.id === 'saas') return 'Outage fallout';
      return 'Platform setback';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    canTrigger: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (level < 1) return false;
      if (definition.id === 'vlog') return level >= 3;
      return true;
    },
    chance: ({ instance }) => {
      const level = getInstanceQualityLevel(instance);
      return Math.min(0.12, 0.05 + level * 0.01);
    },
    duration: ({ instance }) => {
      const level = getInstanceQualityLevel(instance);
      return Math.max(2, Math.min(4, 2 + Math.floor(level / 3)));
    },
    initialPercent: ({ definition, instance }) => {
      const level = getInstanceQualityLevel(instance);
      if (definition.id === 'vlog') {
        return -0.35;
      }
      const min = -0.25;
      const max = -0.12 - level * 0.01;
      return randomBetween(Math.min(min, max), Math.max(min, max));
    },
    dailyPercentChange: () => 0.06
  }
];

export const NICHE_EVENT_BLUEPRINTS = [
  {
    id: 'niche:trendWave',
    tone: 'positive',
    label: ({ definition }) => `${definition?.name || 'Niche'} trend wave`,
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    chance: () => 0.1,
    duration: () => 3,
    initialPercent: () => randomBetween(0.18, 0.32),
    dailyPercentChange: () => -0.06
  },
  {
    id: 'niche:trendDip',
    tone: 'negative',
    label: ({ definition }) => `${definition?.name || 'Niche'} fatigue`,
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    chance: () => 0.06,
    duration: () => 3,
    initialPercent: () => randomBetween(-0.28, -0.12),
    dailyPercentChange: () => 0.07
  }
];
