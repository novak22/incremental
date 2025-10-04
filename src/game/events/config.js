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
    trigger: 'payout',
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
    trigger: 'payout',
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
  },
  {
    id: 'asset:blogQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action, definition }) => {
      const map = {
        writePost: 'Story Spotlight',
        seoSprint: 'Search Spotlight',
        outreachPush: 'Backlink Parade'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return `${definition?.singular || definition?.name || 'Blog'} Glow-Up`;
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'blog',
    chance: ({ action }) => {
      const map = {
        writePost: 0.1,
        seoSprint: 0.08,
        outreachPush: 0.07
      };
      return map[action?.id] ?? 0.06;
    },
    duration: ({ action }) => {
      const map = {
        writePost: [2, 4],
        seoSprint: [2, 3],
        outreachPush: [3, 4]
      };
      const range = map[action?.id] || [2, 3];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        writePost: [0.1, 0.16],
        seoSprint: [0.09, 0.15],
        outreachPush: [0.11, 0.17]
      };
      const range = map[action?.id] || [0.1, 0.14];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: () => -0.03
  },
  {
    id: 'asset:vlogQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action }) => {
      const map = {
        shootEpisode: 'Studio Standing Ovation',
        polishEdit: 'Edit Suite Encore',
        hypePush: 'Channel Hype Cycle'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return 'Channel Glow-Up';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'vlog',
    chance: ({ action }) => {
      const map = {
        shootEpisode: 0.1,
        polishEdit: 0.08,
        hypePush: 0.09
      };
      return map[action?.id] ?? 0.07;
    },
    duration: ({ action }) => {
      const map = {
        shootEpisode: [2, 4],
        polishEdit: [2, 3],
        hypePush: [3, 5]
      };
      const range = map[action?.id] || [2, 4];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        shootEpisode: [0.11, 0.17],
        polishEdit: [0.09, 0.15],
        hypePush: [0.12, 0.18]
      };
      const range = map[action?.id] || [0.1, 0.16];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: ({ action }) => {
      const map = {
        hypePush: -0.035
      };
      return map[action?.id] ?? -0.03;
    }
  },
  {
    id: 'asset:dropshippingQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action }) => {
      const map = {
        researchProduct: 'Trend Scout Spotlight',
        optimizeListing: 'Conversion Glow',
        experimentAds: 'Ad Frenzy Lift'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return 'Storefront Glow-Up';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'dropshipping',
    chance: ({ action }) => {
      const map = {
        researchProduct: 0.08,
        optimizeListing: 0.09,
        experimentAds: 0.1
      };
      return map[action?.id] ?? 0.07;
    },
    duration: ({ action }) => {
      const map = {
        researchProduct: [2, 4],
        optimizeListing: [2, 4],
        experimentAds: [3, 5]
      };
      const range = map[action?.id] || [2, 4];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        researchProduct: [0.09, 0.15],
        optimizeListing: [0.1, 0.16],
        experimentAds: [0.12, 0.18]
      };
      const range = map[action?.id] || [0.1, 0.15];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: () => -0.028
  },
  {
    id: 'asset:saasQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action }) => {
      const map = {
        shipFeature: 'Launch Day Surge',
        improveStability: 'Reliability Spotlight',
        launchCampaign: 'Customer Cheer Burst',
        deployEdgeNodes: 'Edge Acceleration Wave'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return 'Micro-App Glow-Up';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'saas',
    chance: ({ action }) => {
      const map = {
        shipFeature: 0.1,
        improveStability: 0.07,
        launchCampaign: 0.08,
        deployEdgeNodes: 0.09
      };
      return map[action?.id] ?? 0.07;
    },
    duration: ({ action }) => {
      const map = {
        shipFeature: [3, 5],
        improveStability: [2, 4],
        launchCampaign: [2, 3],
        deployEdgeNodes: [3, 5]
      };
      const range = map[action?.id] || [2, 4];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        shipFeature: [0.12, 0.18],
        improveStability: [0.08, 0.13],
        launchCampaign: [0.1, 0.15],
        deployEdgeNodes: [0.12, 0.18]
      };
      const range = map[action?.id] || [0.1, 0.16];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: ({ action }) => {
      const map = {
        shipFeature: -0.035,
        deployEdgeNodes: -0.035
      };
      return map[action?.id] ?? -0.027;
    }
  },
  {
    id: 'asset:ebookQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action }) => {
      const map = {
        writeChapter: 'Chapter Buzz',
        designCover: 'Cover Glow',
        rallyReviews: 'Review Rally'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return 'Series Glow-Up';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'ebook',
    chance: ({ action }) => {
      const map = {
        writeChapter: 0.09,
        designCover: 0.08,
        rallyReviews: 0.1
      };
      return map[action?.id] ?? 0.07;
    },
    duration: ({ action }) => {
      const map = {
        writeChapter: [2, 4],
        designCover: [2, 3],
        rallyReviews: [3, 5]
      };
      const range = map[action?.id] || [2, 4];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        writeChapter: [0.09, 0.15],
        designCover: [0.08, 0.14],
        rallyReviews: [0.11, 0.17]
      };
      const range = map[action?.id] || [0.09, 0.15];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: () => -0.026
  },
  {
    id: 'asset:stockPhotosQualityCelebration',
    trigger: 'qualityAction',
    tone: 'positive',
    label: ({ action }) => {
      const map = {
        planShoot: 'Gallery Spotlight',
        batchEdit: 'Retouch Radiance',
        runPromo: 'Marketplace Cheer'
      };
      if (action?.id && map[action.id]) return map[action.id];
      return 'Gallery Glow-Up';
    },
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === 'stockPhotos',
    chance: ({ action }) => {
      const map = {
        planShoot: 0.08,
        batchEdit: 0.09,
        runPromo: 0.1
      };
      return map[action?.id] ?? 0.07;
    },
    duration: ({ action }) => {
      const map = {
        planShoot: [2, 4],
        batchEdit: [2, 3],
        runPromo: [3, 5]
      };
      const range = map[action?.id] || [2, 4];
      return Math.max(1, Math.round(randomBetween(range[0], range[1])));
    },
    initialPercent: ({ action }) => {
      const map = {
        planShoot: [0.09, 0.16],
        batchEdit: [0.08, 0.14],
        runPromo: [0.11, 0.18]
      };
      const range = map[action?.id] || [0.09, 0.15];
      return randomBetween(range[0], range[1]);
    },
    dailyPercentChange: ({ action }) => {
      const map = {
        runPromo: -0.032
      };
      return map[action?.id] ?? -0.028;
    }
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
