import { randomBetween } from './utils.js';

export const ASSET_QUALITY_EVENT_BLUEPRINTS = [
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
