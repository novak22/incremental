import { ensureArray } from '../../../core/helpers.js';
import { addLog } from '../../../core/log.js';
import { buildSlotLedger, describeSlotLedger } from '../../upgrades/effects/index.js';

export function logHustleBlocked(reason) {
  if (!reason) return;
  addLog(reason, 'warning');
}

export function logEducationPayoffSummary(summary) {
  if (!summary) return;
  addLog(`Your studies kicked in: ${summary}.`, 'educationPayoff');
}

export function logUpgradeBlocked({ context, config, consumes }) {
  let message = config.blockedMessage || 'You still need to meet the requirements first.';
  if (!context.upgradeState?.purchased && context.conflict) {
    message = `${context.conflict.name || 'Another upgrade'} already occupies this lane.`;
  } else if (context.slotConflict) {
    const ledger = buildSlotLedger({ state: context.state });
    const summary = describeSlotLedger(context.slotConflict, ledger);
    const required = consumes?.[context.slotConflict] || 1;
    const available = summary ? Math.max(0, summary.available) : 0;
    message = `You need ${formatSlotLabel(context.slotConflict, required)} available (remaining ${available}).`;
  }
  logHustleBlocked(message);
}

export function formatKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

export function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

export function formatSlotMap(map) {
  if (!map) return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

function describeTargetScope(scope) {
  if (!scope || typeof scope !== 'object') return '';
  const tags = ensureArray(scope.tags).map(tag => `#${tag}`);
  const ids = ensureArray(scope.ids);
  const families = ensureArray(scope.families).map(formatKeyLabel);
  const categories = ensureArray(scope.categories).map(formatKeyLabel);
  const fragments = [];
  if (ids.length) fragments.push(ids.join(', '));
  if (families.length) fragments.push(`${families.join(', ')} family`);
  if (categories.length) fragments.push(`${categories.join(', ')} category`);
  if (tags.length) fragments.push(tags.join(', '));
  return fragments.join(' • ');
}

export function describeEffectSummary(effects, affects) {
  if (!effects || typeof effects !== 'object') return null;
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
    return null;
  }

  const scopeEntries = [];
  const assetScope = describeTargetScope(affects?.assets);
  if (assetScope) {
    scopeEntries.push({ label: 'Assets', value: assetScope });
  }
  const hustleScope = describeTargetScope(affects?.hustles);
  if (hustleScope) {
    scopeEntries.push({ label: 'Hustles', value: hustleScope });
  }
  const actionScope = ensureArray(affects?.actions?.types);
  if (actionScope.length) {
    scopeEntries.push({ label: 'Actions', value: actionScope.join(' • ') });
  }

  const effectList = effectLabels
    .map(label => `<li class="upgrade-effect-summary__item">${label}</li>`)
    .join('');

  const scopeMarkup = scopeEntries.length
    ? `<div class="upgrade-effect-summary__applies">
        <span class="upgrade-effect-summary__applies-label">Applies to</span>
        <div class="upgrade-effect-summary__targets">
          ${scopeEntries.map(entry => `
            <span class="upgrade-effect-summary__target">
              <span class="upgrade-effect-summary__target-label">${entry.label}</span>
              <span class="upgrade-effect-summary__target-value">${entry.value}</span>
            </span>
          `).join('')}
        </div>
      </div>`
    : '';

  return `
    <div class="upgrade-effect-summary">
      <p class="upgrade-effect-summary__title">⚙️ Effects</p>
      <ul class="upgrade-effect-summary__list">${effectList}</ul>
      ${scopeMarkup}
    </div>
  `.trim();
}
