import { formatMoney } from '../../../../core/helpers.js';
import { addMoney } from '../../../currency.js';
import { applyInstantHustleEducationBonus, formatEducationBonusSummary } from '../../../educationEffects.js';
import { applyModifiers } from '../../../data/economyMath.js';
import { recordPayoutContribution } from '../../../metrics.js';
import { getHustleEffectMultiplier } from '../../../upgrades/effects/index.js';
import { applyMetric } from '../metrics.js';
import { logEducationPayoffSummary } from '../logMessaging.js';

function buildMultiplierResult(amount, effect) {
  if (!effect) {
    return { amount, multiplier: 1, sources: [] };
  }

  const baseMultiplier = Number.isFinite(effect.multiplier) ? effect.multiplier : 1;
  if (Array.isArray(effect.modifiers) && effect.modifiers.length) {
    const result = applyModifiers(amount, effect.modifiers, { clamp: effect.clamp });
    const finalAmount = Number.isFinite(result?.value) ? result.value : amount;
    const appliedSources = (result?.applied || [])
      .filter(entry => entry.type === 'multiplier')
      .map(entry => ({ id: entry.id, label: entry.label, multiplier: entry.value }));
    return {
      amount: finalAmount,
      multiplier: Number.isFinite(result?.multiplier) ? result.multiplier : baseMultiplier,
      sources: appliedSources
    };
  }

  if (!Number.isFinite(baseMultiplier) || baseMultiplier === 1) {
    return { amount, multiplier: 1, sources: [] };
  }
  return {
    amount: amount * baseMultiplier,
    multiplier: baseMultiplier,
    sources: effect.sources || []
  };
}

export function createPayoutProcessing({ definition, metadata }) {
  function applyHustlePayoutMultiplier(amount, context) {
    if (!amount) {
      return { amount: 0, multiplier: 1, sources: [] };
    }
    const effect = getHustleEffectMultiplier(definition, 'payout_mult', {
      state: context.state,
      actionType: 'payout'
    });
    return buildMultiplierResult(amount, effect);
  }

  function calculatePayoutContext(baseAmount, context) {
    if (!baseAmount || baseAmount <= 0 || context.__skipDefaultPayout) {
      return null;
    }

    const { amount: educationAdjusted, applied: appliedBonuses } = applyInstantHustleEducationBonus({
      hustleId: metadata.id,
      baseAmount,
      state: context.state
    });

    const upgradeResult = applyHustlePayoutMultiplier(educationAdjusted, context);
    const roundedPayout = Math.max(0, Math.round(upgradeResult.amount));

    return {
      basePayout: baseAmount,
      educationAdjustedPayout: educationAdjusted,
      appliedEducationBoosts: appliedBonuses,
      upgradeMultiplier: upgradeResult.multiplier,
      upgradeSources: upgradeResult.sources,
      finalPayout: roundedPayout,
      payoutGranted: roundedPayout,
      educationSummary: appliedBonuses.length ? formatEducationBonusSummary(appliedBonuses) : null
    };
  }

  function applyPayoutSideEffects(context, payoutDetails) {
    if (!payoutDetails || payoutDetails.finalPayout <= 0) {
      return;
    }

    const bonusNote = payoutDetails.appliedEducationBoosts?.length ? ' Education bonus included!' : '';
    const upgradeNote = payoutDetails.upgradeSources?.length ? ' Upgrades amplified the payout!' : '';

    const template = metadata.payout?.message;
    let message;
    if (typeof template === 'function') {
      message = template({ ...context, ...payoutDetails });
    } else if (template) {
      message = template;
    } else {
      message = `${definition.name} paid $${formatMoney(payoutDetails.finalPayout)}.${bonusNote}${upgradeNote}`;
    }

    addMoney(payoutDetails.finalPayout, message, metadata.payout?.logType);
    applyMetric(recordPayoutContribution, metadata.metrics?.payout, { amount: payoutDetails.finalPayout });

    if (payoutDetails.educationSummary) {
      logEducationPayoffSummary(payoutDetails.educationSummary);
    }
  }

  return { applyHustlePayoutMultiplier, calculatePayoutContext, applyPayoutSideEffects };
}
