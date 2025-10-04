const QUALITY_LEVEL_CACHE = new WeakMap();

export function getQualityConfig(definition) {
  return definition?.quality || null;
}

export function ensureInstanceQuality(definition, instance) {
  if (!instance.quality) {
    instance.quality = { level: 0, progress: {} };
  } else {
    if (!Number.isFinite(Number(instance.quality.level))) {
      instance.quality.level = 0;
    } else {
      instance.quality.level = Math.max(0, Math.floor(Number(instance.quality.level)));
    }
    if (!instance.quality.progress || typeof instance.quality.progress !== 'object') {
      instance.quality.progress = {};
    }
  }
  return instance.quality;
}

export function getSortedLevels(definition) {
  if (!definition) return [];
  if (!QUALITY_LEVEL_CACHE.has(definition)) {
    const config = getQualityConfig(definition);
    if (!config?.levels?.length) {
      QUALITY_LEVEL_CACHE.set(definition, []);
    } else {
      const sorted = [...config.levels].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      QUALITY_LEVEL_CACHE.set(definition, sorted);
    }
  }
  return QUALITY_LEVEL_CACHE.get(definition);
}

export function getQualityLevel(definition, level) {
  const levels = getSortedLevels(definition);
  return levels.find(entry => entry.level === level) || null;
}

export function getNextQualityLevel(definition, level) {
  const levels = getSortedLevels(definition);
  return levels.find(entry => entry.level === level + 1) || null;
}

export function getHighestQualityLevel(definition) {
  const levels = getSortedLevels(definition);
  if (!levels.length) return null;
  return levels.at(-1);
}

function meetsRequirements(progress, requirements = {}) {
  if (!requirements || !Object.keys(requirements).length) {
    return true;
  }
  for (const [key, value] of Object.entries(requirements)) {
    const target = Number(value) || 0;
    if (target <= 0) continue;
    const current = Number(progress?.[key]) || 0;
    if (current < target) {
      return false;
    }
  }
  return true;
}

export function calculateEligibleQualityLevel(definition, progress = {}) {
  const levels = getSortedLevels(definition);
  if (!levels.length) return 0;
  let eligible = 0;
  for (const level of levels) {
    if (meetsRequirements(progress, level.requirements)) {
      eligible = level.level;
    } else {
      break;
    }
  }
  return eligible;
}

export function getOverallQualityRange(definition) {
  const levels = getSortedLevels(definition);
  if (!levels.length) {
    const income = definition?.income || {};
    const base = Math.max(0, Number(income.base) || 0);
    const variance = Math.max(0, Number(income.variance) || 0);
    const min = income.floor ?? Math.round(base * (1 - variance));
    const max = income.ceiling ?? Math.round(base * (1 + variance));
    return {
      min: Math.max(0, min),
      max: Math.max(Math.max(0, min), max)
    };
  }
  const min = levels.reduce((value, level) => Math.min(value, Number(level.income?.min) || 0), Infinity);
  const max = levels.reduce((value, level) => Math.max(value, Number(level.income?.max) || 0), 0);
  return {
    min: Number.isFinite(min) ? Math.max(0, min) : 0,
    max: Math.max(0, max)
  };
}

export function getInstanceQualityRange(definition, instance) {
  const quality = ensureInstanceQuality(definition, instance);
  const levelDef = getQualityLevel(definition, quality.level);
  if (levelDef?.income) {
    return {
      min: Math.max(0, Number(levelDef.income.min) || 0),
      max: Math.max(0, Number(levelDef.income.max) || 0)
    };
  }
  const overall = getOverallQualityRange(definition);
  return overall;
}

export function getQualityLevelSummary(definition) {
  const levels = getSortedLevels(definition);
  return levels.map(level => ({
    level: level.level,
    name: level.name,
    description: level.description,
    income: level.income,
    requirements: level.requirements
  }));
}

export default {
  calculateEligibleQualityLevel,
  ensureInstanceQuality,
  getInstanceQualityRange,
  getNextQualityLevel,
  getOverallQualityRange,
  getQualityConfig,
  getQualityLevel,
  getQualityLevelSummary,
  getSortedLevels,
  getHighestQualityLevel
};
