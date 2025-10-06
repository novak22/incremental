import assert from 'node:assert/strict';

const { acceptHustleOffer } = await import('../../src/game/hustles.js');
const { advanceActionInstance, completeActionInstance } = await import(
  '../../src/game/actions/progress/instances.js'
);
const { spendTime } = await import('../../src/game/time.js');
const { checkDayEnd } = await import('../../src/game/lifecycle.js');
const { flushDirty } = await import('../../src/core/events/invalidationBus.js');

function resolvePrimaryOfferAction(definition, state, { rerollAttempts = 5 } = {}) {
  if (!definition) {
    throw new Error('Missing hustle definition');
  }
  if (!state) {
    throw new Error('Missing hustle state');
  }

  let action = null;
  let attempts = 0;
  while (attempts < rerollAttempts) {
    action = typeof definition.getPrimaryOfferAction === 'function'
      ? definition.getPrimaryOfferAction({ state })
      : typeof definition.action?.resolvePrimaryAction === 'function'
        ? definition.action.resolvePrimaryAction({ state })
        : null;
    if (!action || action.type === 'offer') {
      break;
    }
    if (action.type === 'reroll' && typeof action.reroll === 'function') {
      action.reroll({ day: Number(state?.day) || 1 });
      attempts += 1;
      continue;
    }
    break;
  }

  return action;
}

export function acceptAndCompleteInstantHustle(
  definition,
  state,
  {
    rerollAttempts = 5,
    flushAfterAccept = false,
    flushAfterCompletion = false,
    skipDayEnd = false
  } = {}
) {
  const action = resolvePrimaryOfferAction(definition, state, { rerollAttempts });

  assert.ok(action && action.type === 'offer', `No offer available for ${definition?.id}`);
  assert.equal(Boolean(action.disabled), false, action.disabledReason || 'primary offer should be ready');

  const accepted = acceptHustleOffer(action.offer.id, { state });
  assert.ok(accepted, 'offer should be accepted');

  if (flushAfterAccept) {
    flushDirty();
  }

  const hoursRequired = Number.isFinite(accepted?.hoursRequired)
    ? accepted.hoursRequired
    : Number(definition.time) || 0;
  if (hoursRequired > 0) {
    spendTime(hoursRequired);
  }

  const progressResult = advanceActionInstance(definition, { id: accepted.instanceId }, {
    state,
    hours: hoursRequired,
    metadata: accepted.metadata
  });
  if (!progressResult?.completed) {
    completeActionInstance(definition, { id: accepted.instanceId }, {
      state,
      metadata: accepted.metadata
    });
  }

  if (flushAfterCompletion) {
    flushDirty();
  }

  if (!skipDayEnd) {
    checkDayEnd();
  }

  return accepted;
}

export function ensurePrimaryHustleOffer(definition, state, options) {
  const action = resolvePrimaryOfferAction(definition, state, options);
  assert.ok(action && action.type === 'offer', `No offer available for ${definition?.id}`);
  return action;
}
