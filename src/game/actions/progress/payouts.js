import { toNumber } from '../../../core/helpers.js';
import { completeHustleMarketInstance } from '../../../core/state/slices/hustleMarket.js';
import { addMoney } from '../../currency.js';
import { applyMetric } from '../../content/schema/metrics.js';
import { recordPayoutContribution } from '../../metrics.js';

export function processCompletionPayout({
  definition,
  stored,
  context = {},
  completionDay,
  completionHours,
  state
}) {
  const completionPayload = { completionDay };
  if (Number.isFinite(completionHours) && completionHours >= 0) {
    completionPayload.hoursLogged = completionHours;
  }

  const hustleEntry = completeHustleMarketInstance(state, stored.id, completionPayload);
  if (!hustleEntry) {
    return;
  }

  const payoutSchedule = hustleEntry.payout?.schedule || 'onCompletion';
  const alreadyPaid = hustleEntry.payoutPaid === true;
  if (payoutSchedule !== 'onCompletion' || alreadyPaid) {
    return;
  }

  const payoutCandidates = [
    context.finalPayout,
    context.payoutGranted,
    stored.payoutAwarded,
    hustleEntry.payoutAwarded,
    hustleEntry.payout?.amount
  ];

  let payoutAmount = null;
  for (const candidate of payoutCandidates) {
    const value = toNumber(candidate, null);
    if (Number.isFinite(value) && value > 0) {
      payoutAmount = value;
      break;
    }
  }

  if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
    return;
  }

  const payoutDefinition = definition?.payout || {};
  const logType = payoutDefinition.logType || 'hustle';
  const payoutContext = {
    ...context,
    definition,
    instance: stored,
    finalPayout: payoutAmount,
    payoutGranted: payoutAmount
  };

  let message = null;
  const template = payoutDefinition.message;
  if (typeof template === 'function') {
    try {
      message = template(payoutContext);
    } catch (error) {
      message = null;
    }
  } else if (typeof template === 'string' && template.trim()) {
    message = template;
  }

  addMoney(payoutAmount, message, logType);
  applyMetric(recordPayoutContribution, definition?.metrics?.payout, { amount: payoutAmount });

  stored.payoutAwarded = payoutAmount;
  hustleEntry.payoutAwarded = payoutAmount;
  hustleEntry.payoutPaid = true;
  hustleEntry.payoutPaidOnDay = completionDay;
}
