import { getState } from '../../../../core/state.js';
import { getHustleEffectMultiplier } from '../../../upgrades/effects/index.js';

export function createTimeHelpers({ definition, metadata }) {
  function resolveEffectiveTime(state = getState()) {
    if (!metadata.time) return metadata.time;
    const { multiplier } = getHustleEffectMultiplier(definition, 'setup_time_mult', {
      state,
      actionType: 'setup'
    });
    const adjusted = metadata.time * (Number.isFinite(multiplier) ? multiplier : 1);
    return Number.isFinite(adjusted) ? Math.max(0, adjusted) : metadata.time;
  }

  function computeCompletionHours(instance, fallback = metadata.time) {
    const logged = Number(instance?.hoursLogged);
    if (Number.isFinite(logged) && logged >= 0) {
      return logged;
    }
    const progressHours = Number(instance?.progress?.hoursRequired);
    if (Number.isFinite(progressHours) && progressHours >= 0) {
      return progressHours;
    }
    return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
  }

  return { resolveEffectiveTime, computeCompletionHours };
}
