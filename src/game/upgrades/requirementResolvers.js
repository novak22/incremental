import { getKnowledgeProgress } from '../requirements/knowledgeProgress.js';

function extractKnowledgeIds(requirement) {
  if (Array.isArray(requirement.keys)) {
    return requirement.keys.filter(Boolean);
  }
  if (typeof requirement.key === 'string') {
    const stripped = requirement.key.replace(/^knowledge:/, '');
    if (!stripped) return [];
    return stripped.split('+').map(id => id.trim()).filter(Boolean);
  }
  return [];
}

export function resolveRequirement(requirement) {
  if (!requirement || requirement.type !== 'custom') return requirement;
  const mode =
    requirement.mode || (typeof requirement.key === 'string' && requirement.key.startsWith('knowledge:')
      ? 'knowledge'
      : null);
  if (mode === 'knowledge') {
    const ids = extractKnowledgeIds(requirement);
    if (!ids.length) return requirement;
    return {
      ...requirement,
      met: () => ids.every(id => getKnowledgeProgress(id)?.completed)
    };
  }
  return requirement;
}
