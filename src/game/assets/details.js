import { formatDays, formatHours, formatList, formatMoney } from '../../core/helpers.js';
import { getAssetState } from '../../core/state.js';
import { getDailyIncomeRange } from './payout.js';
import {
  getQualityLevelSummary,
  getQualityTracks
} from './quality.js';

export function ownedDetail(definition) {
  const assetState = getAssetState(definition.id);
  const total = assetState.instances.length;
  if (!total) {
    return '📦 Owned: <strong>0</strong> (ready for your first build)';
  }
  const active = assetState.instances.filter(instance => instance.status === 'active').length;
  const setup = total - active;
  const parts = [];
  if (active) parts.push(`${active} active`);
  if (setup) parts.push(`${setup} in setup`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : '';
  return `📦 Owned: <strong>${total}</strong>${suffix}`;
}

export function setupDetail(definition) {
  const days = Number(definition.setup?.days) || 0;
  const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
  if (days <= 0 && hoursPerDay <= 0) {
    return '⏳ Setup: <strong>Instant</strong>';
  }
  if (days <= 1) {
    return `⏳ Setup: <strong>${formatHours(hoursPerDay)} investment</strong>`;
  }
  return `⏳ Setup: <strong>${formatDays(days)} · ${formatHours(hoursPerDay)}/day</strong>`;
}

export function setupCostDetail(definition) {
  const cost = Number(definition.setup?.cost) || 0;
  return `💵 Setup Cost: <strong>$${formatMoney(cost)}</strong>`;
}

export function incomeDetail(definition) {
  const { min, max } = getDailyIncomeRange(definition);
  return `💸 Income: <strong>$${formatMoney(min)} - $${formatMoney(max)} / day</strong> (quality-scaled)`;
}

export function latestYieldDetail(definition) {
  const assetState = getAssetState(definition.id);
  const active = assetState.instances.filter(instance => instance.status === 'active');
  if (!active.length) {
    return '📊 Latest Yield: <strong>$0</strong> (no active instances)';
  }
  const average =
    active.reduce((sum, instance) => sum + (Number(instance.lastIncome) || 0), 0) / active.length;
  return `📊 Latest Yield: <strong>$${formatMoney(Math.round(average))}</strong> avg per active instance`;
}

export function instanceLabel(definition, index, options = {}) {
  const base = definition?.singular || definition?.name || 'Asset';
  const normalizedIndex = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;

  let targetInstance = options?.instance || null;
  if (!targetInstance && definition?.id) {
    const assetState = getAssetState(definition.id);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    targetInstance = instances[normalizedIndex] || null;
  }

  const customName = typeof targetInstance?.customName === 'string' ? targetInstance.customName.trim() : '';
  if (customName) {
    return customName;
  }

  return `${base} #${normalizedIndex + 1}`;
}

export function qualitySummaryDetail(definition) {
  const tracks = getQualityTracks(definition);
  const summary = getQualityLevelSummary(definition);
  if (!summary.length) return '';
  const highest = summary.at(-1);
  const lowest = summary[0];
  const incomeRange = getDailyIncomeRange(definition);
  const pieces = [`⭐ Quality ${lowest.level} starts at <strong>$${formatMoney(Math.round(incomeRange.min))}/day</strong>`];
  if (highest && highest.level !== lowest.level) {
    pieces.push(
      `Quality ${highest.level} can reach <strong>$${formatMoney(Math.round(highest.income?.max || incomeRange.max))}/day</strong>`
    );
  }
  const trackNames = Object.values(tracks).map(track => track.shortLabel || track.label);
  const trackDetail = trackNames.length ? `Progress via ${formatList(trackNames)}` : '';
  const note = [pieces.join(' · '), trackDetail].filter(Boolean).join(' · ');
  return `✨ Quality: ${note}`;
}

export function qualityProgressDetail(definition) {
  const summary = getQualityLevelSummary(definition);
  if (!summary.length) return '';
  const tracks = getQualityTracks(definition);
  const lines = summary
    .map(level => {
      const requirementEntries = Object.entries(level.requirements || {});
      if (!requirementEntries.length) {
        return `Quality ${level.level}: ${level.name}`;
      }
      const parts = requirementEntries.map(([key, value]) => {
        const label = tracks[key]?.shortLabel || tracks[key]?.label || key;
        return `${value} ${label}`;
      });
      return `Quality ${level.level}: ${level.name} (${parts.join(', ')})`;
    })
    .join(' • ');
  return `📈 Roadmap: ${lines}`;
}

