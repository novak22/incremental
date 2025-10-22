import { ensureArray } from '../../../../../../core/helpers.js';
import { describeTargetScope, formatKeyLabel } from './formatting.js';

export function describeEffectSummary(definition = {}) {
  const effects = definition.effects || {};
  const affects = definition.affects || {};
  const effectLabels = [];

  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% maintenance speed`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality progress`;
        break;
      default:
        label = `${formatKeyLabel(effect)}: ${numeric}`;
    }
    effectLabels.push(label);
  });

  if (!effectLabels.length) {
    return '';
  }

  const scopeParts = [];
  const assetScope = describeTargetScope(affects.assets);
  if (assetScope) scopeParts.push(`assets (${assetScope})`);
  const hustleScope = describeTargetScope(affects.hustles);
  if (hustleScope) scopeParts.push(`hustles (${hustleScope})`);
  const actionScope = ensureArray(affects.actions?.types);
  if (actionScope.length) {
    scopeParts.push(`actions (${actionScope.join(', ')})`);
  }

  const scopeSummary = scopeParts.length ? ` — applies to ${scopeParts.join('; ')}` : '';
  return `${effectLabels.join(', ')}${scopeSummary}`;
}

export default {
  describeEffectSummary
};
