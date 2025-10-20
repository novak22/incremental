import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { summarizeAssetRequirements } from '../../../requirements.js';
import { describeInstantHustleEducationBonuses } from '../../../educationEffects.js';

function formatHourDetail(hours, effective) {
  if (!hours) return '⏳ Time: <strong>Instant</strong>';
  const base = formatHours(hours);
  if (Number.isFinite(Number(effective)) && Math.abs(effective - hours) > 0.01) {
    return `⏳ Time: <strong>${formatHours(effective)}</strong> (base ${base})`;
  }
  return `⏳ Time: <strong>${base}</strong>`;
}

function formatCostDetail(cost) {
  if (!cost) return null;
  return `💵 Cost: <strong>$${formatMoney(cost)}</strong>`;
}

function formatPayoutDetail(payout) {
  if (!payout || !payout.amount) return null;
  const base = `💰 Payout: <strong>$${formatMoney(payout.amount)}</strong>`;
  if (payout.delaySeconds) {
    return `${base} after ${payout.delaySeconds}s`;
  }
  return base;
}

export function buildDetailResolvers({
  metadata,
  config,
  resolveDailyUsage,
  resolveEffectiveTime
}) {
  const baseDetails = [];
  if (metadata.time > 0) {
    baseDetails.push(() => formatHourDetail(metadata.time, resolveEffectiveTime()));
  }
  if (metadata.cost > 0) {
    const detail = formatCostDetail(metadata.cost);
    if (detail) baseDetails.push(() => detail);
  }
  const payoutDetail = formatPayoutDetail(metadata.payout);
  if (payoutDetail) {
    baseDetails.push(() => payoutDetail);
  }
  if (metadata.requirements.length) {
    baseDetails.push(() => `Requires: <strong>${summarizeAssetRequirements(metadata.requirements)}</strong>`);
  }
  if (metadata.dailyLimit) {
    baseDetails.push(() => {
      const usage = resolveDailyUsage();
      const remaining = usage?.remaining ?? metadata.dailyLimit;
      const limit = usage?.limit ?? metadata.dailyLimit;
      const status = remaining > 0 ? `${remaining}/${limit} runs left today` : 'Daily limit reached today';
      return `🗓️ Daily limit: <strong>${limit} per day</strong> (${status})`;
    });
  }

  const educationDetails = describeInstantHustleEducationBonuses(config.id);
  return [...baseDetails, ...educationDetails, ...(config.details || [])];
}
