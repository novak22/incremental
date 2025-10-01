import { getAssetState, getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import {
  assetRequirementsMetById,
  formatAssetRequirementLabel,
  listAssetRequirementDescriptors
} from '../../../game/requirements.js';
import { getAssetEffectMultiplier } from '../../../game/upgrades/effects.js';
import { describeAssetCardSummary, formatInstanceUpkeep } from '../utils.js';

const ASSET_GROUP_NOTES = {
  Foundation: 'Steady launchpads that bankroll the rest of your ventureverse.',
  Creative: 'Audience magnets that shimmer with story, art, and charisma.',
  Commerce: 'Commerce engines that keep carts chiming and partners smiling.',
  Tech: 'High-powered systems with upkeep, but outrageous reach when fueled.'
};

const ASSET_GROUP_ICONS = {
  Foundation: '🏗️',
  Creative: '🎨',
  Commerce: '🛍️',
  Tech: '🚀'
};

export function getAssetGroupLabel(definition) {
  return definition?.tag?.label || 'Special';
}

export function getAssetGroupId(definition) {
  const label = getAssetGroupLabel(definition);
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function getAssetGroupNote(label) {
  return ASSET_GROUP_NOTES[label] || 'Bundle kindred builds together to compare potential at a glance.';
}

export function describeAssetLaunchAvailability(definition, state = getState()) {
  if (!definition) {
    return { disabled: true, reasons: ['Definition missing.'], hours: 0, cost: 0 };
  }

  const reasons = [];
  const requirementsMet = assetRequirementsMetById(definition.id, state);
  if (!requirementsMet) {
    const descriptors = listAssetRequirementDescriptors(definition, state).filter(desc => !desc.met);
    if (descriptors.length) {
      const names = descriptors.map(desc => desc.label).join(', ');
      reasons.push(`Requires ${names}`);
    } else {
      const label = formatAssetRequirementLabel(definition.id, state);
      if (label) {
        reasons.push(label);
      }
    }
  }

  const baseHours = Number(definition.setup?.hoursPerDay) || 0;
  const effect = getAssetEffectMultiplier(definition, 'setup_time_mult', { actionType: 'setup' });
  const multiplier = Number.isFinite(effect?.multiplier) ? effect.multiplier : 1;
  const hours = baseHours > 0 ? baseHours * multiplier : 0;
  if (hours > 0 && state.timeLeft < hours) {
    reasons.push(`Need ${formatHours(hours)} free (have ${formatHours(state.timeLeft)})`);
  }

  const cost = Number(definition.setup?.cost) || 0;
  if (cost > 0 && state.money < cost) {
    reasons.push(`Need $${formatMoney(cost)} (have $${formatMoney(Math.max(0, Math.floor(state.money)))})`);
  }

  return { disabled: reasons.length > 0, reasons, hours, cost };
}

export function buildAssetModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    getAssetState: getAssetStateFn = getAssetState
  } = helpers;

  const state = getStateFn();
  const groups = new Map();
  const launchers = [];

  definitions.forEach(definition => {
    const groupId = getAssetGroupId(definition);
    const label = getAssetGroupLabel(definition);
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label,
        note: getAssetGroupNote(label),
        icon: ASSET_GROUP_ICONS[label] || '✨',
        definitions: [],
        instances: []
      });
    }
    const entry = groups.get(groupId);
    entry.definitions.push({
      id: definition.id,
      name: definition.name || definition.id,
      summary: describeAssetCardSummary(definition),
      definition
    });

    const assetState = getAssetStateFn(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      const status = instance.status === 'active' ? 'active' : 'setup';
      const needsMaintenance = status === 'active' && !instance.maintenanceFundedToday;
      const nicheId = typeof instance.nicheId === 'string' ? instance.nicheId : null;
      entry.instances.push({
        definitionId: definition.id,
        id: instance.id,
        index,
        status,
        needsMaintenance,
        nicheId,
        risk: definition.tag?.type === 'advanced' ? 'high' : 'medium',
        filters: {
          group: groupId,
          status,
          needsMaintenance,
          niche: nicheId,
          risk: definition.tag?.type === 'advanced' ? 'high' : 'medium'
        },
        definition,
        instance: instance || null
      });
    });

    if (definition.action) {
      const availability = describeAssetLaunchAvailability(definition, state);
      const labelText = typeof definition.action.label === 'function'
        ? definition.action.label(state)
        : definition.action.label || `Launch ${definition.singular || definition.name || 'venture'}`;
      launchers.push({
        id: definition.id,
        name: definition.name || definition.id,
        summary: describeAssetCardSummary(definition),
        setup: {
          days: Number(definition.setup?.days) || 0,
          hoursPerDay: Number(definition.setup?.hoursPerDay) || 0,
          cost: Number(definition.setup?.cost) || 0
        },
        upkeep: formatInstanceUpkeep(definition),
        action: {
          label: labelText,
          disabled: availability.disabled,
          reasons: availability.reasons,
          hours: availability.hours,
          cost: availability.cost,
          className: definition.action.className || 'primary',
          onClick: typeof definition.action.onClick === 'function' ? definition.action.onClick : null
        },
        filters: {
          group: groupId,
          tag: definition.tag?.type || 'general'
        },
        singular: definition.singular || 'Passive venture',
        definition
      });
    }
  });

  return {
    groups: Array.from(groups.values()),
    launchers
  };
}

export default buildAssetModels;
