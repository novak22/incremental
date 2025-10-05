import { addLog } from '../../core/log.js';
import { getAssetState } from '../../core/state.js';

function formatPercentDisplay(value) {
  const numeric = Number(value) || 0;
  const rounded = Math.round(Math.abs(numeric * 100));
  return `${rounded}%`;
}

function formatInstanceLabel(definition, instanceIndex) {
  const base = definition?.singular || definition?.name || 'Asset';
  if (instanceIndex == null || instanceIndex < 0) {
    return base;
  }
  return `${base} #${instanceIndex + 1}`;
}

function getInstanceIndex(definition, instanceId) {
  const assetState = getAssetState(definition.id);
  if (!assetState) return -1;
  return assetState.instances.findIndex(entry => entry?.id === instanceId);
}

export function logAssetEventStart({ event, blueprint, definition, instanceIndex }) {
  if (!event) return;
  const label = formatInstanceLabel(definition, instanceIndex);
  const percent = formatPercentDisplay(event.currentPercent);
  const days = event.totalDays === 1 ? 'today' : `for about ${event.totalDays} days`;
  const tone = event.tone === 'negative' ? 'warning' : 'info';
  const emoji = event.tone === 'negative' ? '⚠️' : '🚀';
  const descriptor = blueprint?.id === 'asset:viralTrend' && definition.id === 'vlog' ? 'viral burst' : event.label;
  const message =
    event.tone === 'negative'
      ? `${emoji} ${label} hit a ${descriptor}. Expect roughly −${percent} earnings ${days}.`
      : `${emoji} ${label} caught a ${descriptor}! Earnings jump around +${percent} ${days}.`;
  addLog(message, tone);
}

export function logAssetEventEnd({ event, definition }) {
  const label = formatInstanceLabel(definition, getInstanceIndex(definition, event.target.instanceId));
  const tone = event.tone === 'negative' ? 'info' : 'info';
  const emoji = event.tone === 'negative' ? '💪' : '✨';
  const message =
    event.tone === 'negative'
      ? `${emoji} ${label} worked through the ${event.label.toLowerCase()}. Earnings are steady again.`
      : `${emoji} ${label}'s ${event.label.toLowerCase()} fades. Payouts glide back toward normal.`;
  addLog(message, tone);
}

export function logNicheEventStart({ event, definition }) {
  if (!event || !definition) return;
  const tone = event.tone === 'negative' ? 'warning' : 'info';
  const emoji = event.tone === 'negative' ? '📉' : '📈';
  const percent = formatPercentDisplay(event.currentPercent);
  const days = event.totalDays === 1 ? 'today' : `for about ${event.totalDays} days`;
  const direction = event.tone === 'negative' ? 'dips by roughly' : 'soars about';
  const message = `${emoji} ${definition.name} ${event.label.toLowerCase()}! Payouts for aligned assets ${direction} ${percent} ${days}.`;
  addLog(message, tone);
}

export function logNicheEventEnd({ event, definition }) {
  if (!event || !definition) return;
  const emoji = event.tone === 'negative' ? '🌤️' : '🌬️';
  const message =
    event.tone === 'negative'
      ? `${emoji} ${definition.name} shakes off the ${event.label.toLowerCase()}. Trendlines brighten.`
      : `${emoji} ${event.label} settles down for ${definition.name}. Multipliers return to baseline.`;
  addLog(message, 'info');
}
