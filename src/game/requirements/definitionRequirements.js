import { buildRequirementBundle, resolveRequirementConfig } from '../schema/requirements.js';

const EMPTY_REQUIREMENTS = buildRequirementBundle();
const requirementCache = new WeakMap();

export function getDefinitionRequirements(definition) {
  if (!definition) return EMPTY_REQUIREMENTS;
  if (requirementCache.has(definition)) {
    return requirementCache.get(definition);
  }
  const config = resolveRequirementConfig(definition);
  if (!config) {
    requirementCache.set(definition, EMPTY_REQUIREMENTS);
    return EMPTY_REQUIREMENTS;
  }
  const bundle = buildRequirementBundle(config);
  requirementCache.set(definition, bundle);
  return bundle;
}

