import { getAssetState } from '../../../../core/state.js';
import { getAssistantCount, getAssistantDailyCost } from '../../../../game/assistant.js';
import { instanceLabel } from '../../../../game/assets/details.js';
import { getKnowledgeProgress } from '../../../../game/requirements.js';
import { buildSkillRewards, resolveTrack } from '../education.js';
import { ensureArray, toCurrency } from './utils.js';

export function collectUnfundedUpkeep(assetDefinitions = [], state, services = {}) {
  const {
    getAssetState: getAssetStateFn = getAssetState,
    instanceLabel: instanceLabelFn = instanceLabel
  } = services;

  let total = 0;
  let count = 0;
  const entries = [];

  assetDefinitions.forEach(definition => {
    const assetState = getAssetStateFn(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active' || instance.maintenanceFundedToday) return;
      const cost = Math.max(0, Number(definition.maintenance?.cost) || 0);
      if (cost <= 0) return;
      total += cost;
      count += 1;
      entries.push({
        id: instance.id,
        label: instanceLabelFn(definition, index),
        amount: toCurrency(cost)
      });
    });
  });

  return { total: toCurrency(total), count, entries };
}

export function collectTuitionCommitments(educationDefinitions = [], state, services = {}) {
  const {
    resolveTrack: resolveTrackFn = resolveTrack,
    getKnowledgeProgress: getKnowledgeProgressFn = getKnowledgeProgress,
    buildSkillRewards: buildSkillRewardsFn = buildSkillRewards
  } = services;

  const entries = [];

  educationDefinitions.forEach(definition => {
    const track = resolveTrackFn(definition);
    const progress = getKnowledgeProgressFn(track.id, state);
    if (!progress.enrolled || progress.completed) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewardsFn(track.id);
    const skillNames = ensureArray(rewards.skills).map(skill => skill.name).filter(Boolean);
    const bonusParts = [];
    if (rewards.xp > 0) {
      bonusParts.push(`${rewards.xp} XP`);
    }
    if (skillNames.length) {
      bonusParts.push(`Boosts: ${skillNames.join(', ')}`);
    }
    entries.push({
      id: track.id,
      name: track.name,
      tuition: toCurrency(track.tuition),
      remainingDays,
      totalDays: track.days,
      hoursPerDay: track.hoursPerDay,
      studiedToday: Boolean(progress.studiedToday),
      bonus: bonusParts.join(' • ') || track.summary
    });
  });

  const total = entries.reduce((sum, entry) => sum + entry.tuition, 0);
  return { total: toCurrency(total), entries };
}

export function buildObligations(state, assetDefinitions = [], educationDefinitions = [], services = {}) {
  const {
    getAssistantCount: getAssistantCountFn = getAssistantCount,
    getAssistantDailyCost: getAssistantDailyCostFn = getAssistantDailyCost,
    getAssetState: getAssetStateFn = getAssetState,
    instanceLabel: instanceLabelFn = instanceLabel,
    resolveTrack: resolveTrackFn = resolveTrack,
    getKnowledgeProgress: getKnowledgeProgressFn = getKnowledgeProgress,
    buildSkillRewards: buildSkillRewardsFn = buildSkillRewards
  } = services;

  const upkeep = collectUnfundedUpkeep(assetDefinitions, state, {
    getAssetState: getAssetStateFn,
    instanceLabel: instanceLabelFn
  });
  const assistants = Math.max(0, Number(getAssistantCountFn(state)) || 0);
  const payroll = toCurrency(getAssistantDailyCostFn(state));
  const tuition = collectTuitionCommitments(educationDefinitions, state, {
    resolveTrack: resolveTrackFn,
    getKnowledgeProgress: getKnowledgeProgressFn,
    buildSkillRewards: buildSkillRewardsFn
  });

  const entries = [];
  entries.push({
    id: 'upkeep',
    label: 'Unfunded upkeep',
    amount: upkeep.total,
    note: upkeep.count > 0 ? `${upkeep.count} asset${upkeep.count === 1 ? '' : 's'} waiting` : 'All assets covered',
    items: upkeep.entries
  });
  entries.push({
    id: 'payroll',
    label: 'Assistant payroll',
    amount: payroll,
    note: assistants > 0 ? `${assistants} assistant${assistants === 1 ? '' : 's'} on staff` : 'No assistants hired'
  });
  entries.push({
    id: 'tuition',
    label: 'Study commitments',
    amount: tuition.total,
    note: tuition.entries.length
      ? `${tuition.entries.length} active course${tuition.entries.length === 1 ? '' : 's'}`
      : 'No tuition in progress',
    items: tuition.entries
  });

  const actionable = entries.filter(entry => entry.amount > 0);
  const quick = actionable.length
    ? actionable.sort((a, b) => b.amount - a.amount)[0]
    : { id: 'clear', label: 'All obligations covered', amount: 0, note: 'Nothing urgent' };

  return { entries, quick };
}

export default {
  collectUnfundedUpkeep,
  collectTuitionCommitments,
  buildObligations
};
