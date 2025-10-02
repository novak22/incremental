import { getAssetState } from '../../core/state.js';
import { getKnowledgeProgress } from '../requirements.js';

function countActiveInstances(assetId) {
  if (!assetId) return 0;
  const state = getAssetState(assetId);
  const instances = state?.instances || [];
  return instances.filter(instance => instance.status === 'active').length;
}

function describeKnowledgeProgress(knowledgeId) {
  if (!knowledgeId) return 'Not started';
  const progress = getKnowledgeProgress(knowledgeId);
  const totalDays = progress?.totalDays || 0;
  const completed = Boolean(progress?.completed);
  const daysCompleted = progress?.daysCompleted || 0;
  if (completed) {
    return 'Completed';
  }
  if (totalDays > 0) {
    const percent = Math.min(100, Math.round((daysCompleted / totalDays) * 100));
    return `${percent}% complete (${daysCompleted}/${totalDays} days)`;
  }
  return 'Not started';
}

export function resolveDetailEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'function') return entry;
  if (typeof entry === 'string') {
    return () => entry;
  }
  if (entry.behavior === 'activeAssetCount') {
    const label = entry.label || 'Active assets';
    const { assetId } = entry;
    return () => `${label}: <strong>${countActiveInstances(assetId)}</strong>`;
  }
  if (entry.behavior === 'knowledgeProgress') {
    const label = entry.label || 'Progress';
    const { knowledgeId } = entry;
    return () => `${label}: <strong>${describeKnowledgeProgress(knowledgeId)}</strong>`;
  }
  return null;
}

export { countActiveInstances, describeKnowledgeProgress };
