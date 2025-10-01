import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';

export function buildHustleModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    describeRequirements = describeHustleRequirements,
    getUsage = getHustleDailyUsage,
    formatHours: formatHoursFn = formatHours,
    formatMoney: formatMoneyFn = formatMoney
  } = helpers;

  const state = getStateFn();

  return definitions.map(definition => {
    const time = Number(definition.time || definition.action?.timeCost) || 0;
    const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
    const roi = time > 0 ? payout / time : payout;
    const searchPieces = [definition.name, definition.description].filter(Boolean).join(' ');
    const search = searchPieces.toLowerCase();

    const requirements = (describeRequirements?.(definition, state) || []).map(req => ({ ...req }));
    const requirementSummary = requirements.length
      ? requirements.map(req => `${req.label} ${req.met ? '✓' : '•'}`).join('  ')
      : 'No requirements';

    const usage = getUsage?.(definition, state) || null;
    const limitSummary = usage
      ? usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Daily limit reached for today. Resets tomorrow.'
      : '';

    const actionDisabled = definition.action
      ? typeof definition.action.disabled === 'function'
        ? definition.action.disabled(state)
        : Boolean(definition.action.disabled)
      : true;

    const actionLabel = definition.action
      ? typeof definition.action.label === 'function'
        ? definition.action.label(state)
        : definition.action.label || 'Queue'
      : '';

    const badges = [`${formatHoursFn(time)} time`];
    if (payout > 0) {
      badges.push(`$${formatMoneyFn(payout)} payout`);
    }
    if (definition.tag?.label) {
      badges.push(definition.tag.label);
    }

    return {
      id: definition.id,
      name: definition.name || definition.id,
      description: definition.description || '',
      tag: definition.tag || null,
      metrics: {
        time: { value: time, label: formatHoursFn(time) },
        payout: { value: payout, label: payout > 0 ? `$${formatMoneyFn(payout)}` : '' },
        roi
      },
      badges,
      requirements: {
        summary: requirementSummary,
        items: requirements
      },
      limit: usage
        ? {
            ...usage,
            summary: limitSummary,
            exhausted: usage.remaining <= 0
          }
        : null,
      action: definition.action
        ? {
            label: actionLabel,
            disabled: actionDisabled,
            className: definition.action.className || 'primary'
          }
        : null,
      available: !actionDisabled,
      filters: {
        search,
        time,
        payout,
        roi,
        available: !actionDisabled,
        limitRemaining: usage ? usage.remaining : null,
        tag: definition.tag?.label || ''
      }
    };
  });
}

export default buildHustleModels;
