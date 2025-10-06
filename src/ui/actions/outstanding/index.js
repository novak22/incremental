import { formatHours } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { getActionDefinition } from '../../../game/registryService.js';
import { clampToZero } from '../utils.js';
import collectMarketIndexes from './marketIndexes.js';
import createOutstandingEntry from './entryBuilders.js';
import { resolveStudyTrackIdFromProgress } from './progressSnapshots.js';

export function collectOutstandingActionEntries(state = getState()) {
  const workingState = state || getState() || {};
  const actions = workingState?.actions || {};
  const { offersById, acceptedByInstance, acceptedByOffer } = collectMarketIndexes(workingState);

  const entries = [];
  const actionIds = Object.keys(actions);

  actionIds.forEach((actionId, index) => {
    const actionState = actions[actionId];
    if (!actionState) return;
    const instances = Array.isArray(actionState.instances) ? actionState.instances : [];
    if (!instances.length) return;

    const definition = getActionDefinition(actionId);
    instances.forEach((instance, instanceIndex) => {
      if (!instance || instance.completed) return;
      if (instance.status && instance.status !== 'active' && instance.status !== 'pending') {
        return;
      }

      const accepted = acceptedByInstance.get(instance.id)
        || acceptedByOffer.get(instance.offerId)
        || null;
      if (!accepted && !instance.accepted) {
        return;
      }

      const offer = accepted?.offerId ? offersById.get(accepted.offerId) : null;
      const entry = createOutstandingEntry({
        state: workingState,
        definition,
        instance,
        accepted,
        offer,
        order: -(index * 10 + instanceIndex)
      });
      if (entry) {
        const trackId = resolveStudyTrackIdFromProgress(entry.progress);
        if (trackId) {
          const knowledge = workingState?.progress?.knowledge || {};
          if (knowledge[trackId]?.studiedToday) {
            return;
          }
        }
        entries.push(entry);
      }
    });
  });

  entries.sort((a, b) => {
    const daysA = a?.progress?.remainingDays ?? Infinity;
    const daysB = b?.progress?.remainingDays ?? Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    const payoutA = Number.isFinite(a?.payout) ? a.payout : 0;
    const payoutB = Number.isFinite(b?.payout) ? b.payout : 0;
    if (payoutA !== payoutB) {
      return payoutB - payoutA;
    }
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });

  return entries;
}

export function createAutoCompletedEntries(summary = {}) {
  const entries = Array.isArray(summary?.timeBreakdown) ? summary.timeBreakdown : [];
  return entries
    .map((entry, index) => {
      const hours = clampToZero(entry?.hours);
      if (hours <= 0) return null;
      const category = typeof entry?.category === 'string' ? entry.category.toLowerCase() : '';
      const tracksMaintenance = category.startsWith('maintenance');
      const tracksStudy = category.startsWith('study') || category.startsWith('education');
      if (!tracksMaintenance && !tracksStudy) {
        return null;
      }

      const title = entry?.label
        || entry?.definition?.label
        || entry?.definition?.name
        || 'Scheduled work';
      const key = entry?.key || `${category || 'auto'}-${index}`;
      return {
        id: `auto:${key}`,
        title,
        durationHours: hours,
        durationText: formatHours(hours),
        category
      };
    })
    .filter(Boolean);
}

export function applyAutoCompletedEntries(target = {}, summary = {}) {
  if (!target || typeof target !== 'object') {
    return target;
  }
  const autoCompletedEntries = createAutoCompletedEntries(summary);
  if (autoCompletedEntries.length) {
    target.autoCompletedEntries = autoCompletedEntries;
  } else {
    delete target.autoCompletedEntries;
  }
  return target;
}

export default {
  collectOutstandingActionEntries,
  createAutoCompletedEntries,
  applyAutoCompletedEntries
};
