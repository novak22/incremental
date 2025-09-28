const SUPPORTED_TYPES = ['equipment', 'knowledge', 'experience'];

function normalizeEquipment(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return { type: 'equipment', id: value };
  }
  if (typeof value === 'object') {
    const id = value.id ?? value.value ?? value.key;
    if (!id) return null;
    return { type: 'equipment', id };
  }
  return null;
}

function normalizeKnowledge(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return { type: 'knowledge', id: value };
  }
  if (typeof value === 'object') {
    const id = value.id ?? value.trackId ?? value.value;
    if (!id) return null;
    return { type: 'knowledge', id };
  }
  return null;
}

function normalizeExperience(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return { type: 'experience', assetId: value, count: 1 };
  }
  if (typeof value === 'object') {
    const assetId = value.assetId ?? value.id ?? value.asset;
    if (!assetId) return null;
    const count = Number(value.count ?? value.value ?? value.required ?? 0);
    return { type: 'experience', assetId, count: Number.isFinite(count) ? Math.max(0, count) : 0 };
  }
  return null;
}

const NORMALIZERS = {
  equipment: normalizeEquipment,
  knowledge: normalizeKnowledge,
  experience: normalizeExperience
};

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function finalizeBundle({ all, byType }) {
  const bundle = {
    all,
    byType,
    hasAny: all.length > 0,
    every(predicate) {
      if (typeof predicate !== 'function') return false;
      return all.every(predicate);
    },
    some(predicate) {
      if (typeof predicate !== 'function') return false;
      return all.some(predicate);
    },
    map(mapper) {
      if (typeof mapper !== 'function') return [];
      return all.map(mapper);
    },
    filter(predicate) {
      if (typeof predicate !== 'function') return [];
      return all.filter(predicate);
    },
    missing(predicate) {
      if (typeof predicate !== 'function') return [...all];
      return all.filter(item => !predicate(item));
    }
  };
  return bundle;
}

function normalizeRequirementEntry(entry) {
  if (!entry) return null;
  if (entry.type && NORMALIZERS[entry.type]) {
    return NORMALIZERS[entry.type](entry);
  }
  return null;
}

export function normalizeRequirementConfig(config) {
  const byType = {
    equipment: [],
    knowledge: [],
    experience: []
  };
  const all = [];

  if (!config) {
    return finalizeBundle({ all, byType });
  }

  if (Array.isArray(config)) {
    for (const item of config) {
      const normalized = normalizeRequirementEntry(item);
      if (normalized && SUPPORTED_TYPES.includes(normalized.type)) {
        byType[normalized.type].push(normalized);
        all.push(normalized);
      }
    }
    return finalizeBundle({ all, byType });
  }

  if (typeof config === 'object') {
    const entries = Object.entries(config);
    for (const [type, value] of entries) {
      if (!SUPPORTED_TYPES.includes(type)) continue;
      const list = toArray(value);
      for (const item of list) {
        const normalized = NORMALIZERS[type](item);
        if (normalized) {
          byType[type].push(normalized);
          all.push(normalized);
        }
      }
    }
    return finalizeBundle({ all, byType });
  }

  return finalizeBundle({ all, byType });
}

export function buildRequirementBundle(config) {
  return normalizeRequirementConfig(config);
}

export function resolveRequirementConfig(definition) {
  if (!definition) return null;
  if (definition.requirements) {
    return definition.requirements;
  }
  if (definition.requiresUpgrade) {
    const upgrades = Array.isArray(definition.requiresUpgrade)
      ? definition.requiresUpgrade
      : [definition.requiresUpgrade];
    return { equipment: upgrades };
  }
  return null;
}
