import { randomBetween } from './utils.js';

export const NICHE_TREND_BLUEPRINTS = [
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
