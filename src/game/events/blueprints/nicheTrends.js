import { randomBetween } from './utils.js';

const PLAN_CACHE_KEY = Symbol('nicheTrendPlans');

const DURATION_RANGE = { min: 5, max: 10 };

const POSITIVE_PLAN_CONFIG = {
  tone: 'positive',
  initialRange: { min: 0.08, max: 0.16 },
  swingRange: { min: 0.22, max: 0.38 },
  clamp: value => Math.min(0.95, value)
};

const NEGATIVE_PLAN_CONFIG = {
  tone: 'negative',
  initialRange: { min: -0.18, max: -0.12 },
  swingRange: { min: 0.24, max: 0.42 },
  clamp: value => Math.max(-0.95, value)
};

function rollDuration() {
  const rolled = Math.round(randomBetween(DURATION_RANGE.min, DURATION_RANGE.max));
  return Math.max(DURATION_RANGE.min, Math.min(DURATION_RANGE.max, rolled));
}

function rollPlan({ tone, initialRange, swingRange, clamp }) {
  const duration = rollDuration();
  const steps = Math.max(1, duration - 1);
  const initialPercent = randomBetween(initialRange.min, initialRange.max);
  const swing = randomBetween(swingRange.min, swingRange.max);
  const targetPercent = clamp(initialPercent + (tone === 'positive' ? swing : -swing));
  const dailyPercentChange = (targetPercent - initialPercent) / steps;
  return {
    duration,
    initialPercent,
    dailyPercentChange,
    targetPercent
  };
}

function getPlan(context, blueprintId, config) {
  if (!context || typeof context !== 'object') {
    return rollPlan(config);
  }
  const plans = (context[PLAN_CACHE_KEY] = context[PLAN_CACHE_KEY] || {});
  if (!plans[blueprintId]) {
    plans[blueprintId] = rollPlan(config);
  }
  return plans[blueprintId];
}

export const NICHE_TREND_BLUEPRINTS = [
  {
    id: 'niche:trendWave',
    tone: 'positive',
    label: ({ definition }) => `${definition?.name || 'Niche'} trend wave`,
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    chance: () => 0.1,
    duration: context => getPlan(context, 'niche:trendWave', POSITIVE_PLAN_CONFIG).duration,
    initialPercent: context => getPlan(context, 'niche:trendWave', POSITIVE_PLAN_CONFIG).initialPercent,
    dailyPercentChange: context => getPlan(context, 'niche:trendWave', POSITIVE_PLAN_CONFIG).dailyPercentChange
  },
  {
    id: 'niche:trendDip',
    tone: 'negative',
    label: ({ definition }) => `${definition?.name || 'Niche'} fatigue`,
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => Boolean(definition?.id),
    chance: () => 0.06,
    duration: context => getPlan(context, 'niche:trendDip', NEGATIVE_PLAN_CONFIG).duration,
    initialPercent: context => getPlan(context, 'niche:trendDip', NEGATIVE_PLAN_CONFIG).initialPercent,
    dailyPercentChange: context => getPlan(context, 'niche:trendDip', NEGATIVE_PLAN_CONFIG).dailyPercentChange
  }
];
