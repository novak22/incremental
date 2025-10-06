import { toNumber } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { spendMoney } from '../../currency.js';
import { recordCostContribution } from '../../metrics.js';
import { applyMetric, normalizeHustleMetrics } from './metrics.js';
import { logEducationPayoffSummary } from './logMessaging.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { createContractTemplate } from '../../actions/templates/contract.js';
import {
  ensureActionMarketCategoryState,
  getActionMarketAvailableOffers
} from '../../../core/state/slices/actionMarket/index.js';
import { rollDailyOffers } from '../../hustles/market.js';
import { buildProgressDefaults, buildDefaultState } from './assetActions/progressDefaults.js';
import { buildDetailResolvers } from './assetActions/formatting.js';
import { createDailyLimitTracker, createExecutionHooks } from './assetActions/execution.js';

export function createInstantHustle(config) {
  const metadata = {
    id: config.id,
    time: toNumber(config.time, 0),
    cost: toNumber(config.cost, 0),
    requirements: config.requirements || [],
    payout: config.payout
      ? {
          amount: toNumber(config.payout.amount, 0),
          delaySeconds: toNumber(config.payout.delaySeconds, 0) || undefined,
          grantOnAction: config.payout.grantOnAction !== false,
          logType: config.payout.logType || 'hustle',
          message: config.payout.message
        }
      : null,
    metrics: normalizeHustleMetrics(config.id, config.metrics || {}),
    skills: config.skills,
    dailyLimit: Number.isFinite(Number(config.dailyLimit)) && Number(config.dailyLimit) > 0
      ? Math.max(1, Math.floor(Number(config.dailyLimit)))
      : null
  };

  const {
    resolveDailyUsage,
    reserveDailyUsage,
    releaseDailyUsage,
    consumeDailyUsage
  } = createDailyLimitTracker(metadata);

  const progressDefaults = buildProgressDefaults({ metadata, config });

  const baseDefinition = {
    ...config,
    type: 'hustle',
    tag: config.tag || { label: 'Instant', type: 'instant' },
    defaultState: buildDefaultState({ config, metadata }),
    dailyLimit: metadata.dailyLimit,
    skills: metadata.skills,
    progress: progressDefaults,
    time: metadata.time
  };

  const acceptHooks = [];
  if (Array.isArray(config.acceptHooks)) {
    for (const hook of config.acceptHooks) {
      if (typeof hook === 'function') {
        acceptHooks.push(hook);
      }
    }
  }

  acceptHooks.push(context => {
    const state = context?.state || getState();
    if (!state) return;
    if (metadata.cost > 0) {
      spendMoney(metadata.cost);
      applyMetric(recordCostContribution, metadata.metrics.cost, { amount: metadata.cost });
      if (context?.instance) {
        context.instance.costPaid = (context.instance.costPaid || 0) + metadata.cost;
      }
    }
  });

  if (typeof config.onAccept === 'function') {
    acceptHooks.push(config.onAccept);
  }

  const completionHooks = [];
  completionHooks.push(hookContext => {
    if (hookContext?.__educationSummary) {
      logEducationPayoffSummary(hookContext.__educationSummary);
    }
  });

  if (typeof config.onComplete === 'function') {
    completionHooks.push(config.onComplete);
  }

  completionHooks.push(hookContext => {
    markDirty('cards');
    config.onRun?.(hookContext);
  });

  const definition = createContractTemplate(baseDefinition, {
    templateKind: 'manual',
    category: config.category || 'hustle',
    market: config.market,
    dailyLimit: metadata.dailyLimit,
    availability: config.availability,
    progress: progressDefaults,
    accept: {
      progress: progressDefaults,
      hooks: acceptHooks.map(hook => context => {
        hook({
          ...context,
          metadata: context.metadata || metadata,
          definition: context.definition || definition
        });
      })
    },
    complete: {
      hooks: completionHooks.map(hook => context => {
        hook({
          ...context,
          metadata: context.metadata || metadata,
          definition: context.definition || definition
        });
      })
    }
  });

  definition.tags = Array.isArray(config.tags) ? config.tags.slice() : [];

  const hooks = createExecutionHooks({
    definition,
    metadata,
    config,
    resolveDailyUsage,
    reserveDailyUsage,
    releaseDailyUsage,
    consumeDailyUsage
  });

  definition.dailyLimit = metadata.dailyLimit;
  definition.getDailyUsage = state => resolveDailyUsage(state, { sync: false });

  definition.details = buildDetailResolvers({
    metadata,
    config,
    resolveDailyUsage,
    resolveEffectiveTime: hooks.resolveEffectiveTime
  });

  const actionClassName = config.actionClassName || 'primary';

  function resolvePrimaryOfferAction({ state = getState(), includeUpcoming = true } = {}) {
    const workingState = state || getState();
    if (!workingState) {
      return null;
    }
    const currentDay = Math.max(1, Math.floor(Number(workingState.day) || 1));
    const marketState = ensureActionMarketCategoryState(workingState, 'hustle', { fallbackDay: currentDay });
    if (!marketState) {
      return null;
    }
    const offers = getActionMarketAvailableOffers(workingState, 'hustle', {
      day: currentDay,
      includeUpcoming
    });
    const matching = offers.filter(offer => offer?.templateId === metadata.id || offer?.definitionId === metadata.id);
    if (matching.length) {
      const readyOffer = matching.find(offer => Number(offer?.availableOnDay ?? currentDay) <= currentDay);
      const primary = readyOffer || matching[0];
      const label = primary?.variant?.label || definition.name || primary?.templateId || metadata.id;
      const disabledReason = hooks.getDisabledReason(workingState);
      return {
        type: 'offer',
        offer: primary,
        ready: Boolean(readyOffer),
        label: `Accept ${label}`,
        disabled: Boolean(disabledReason),
        disabledReason
      };
    }

    const rerollLabel = definition.market?.manualRerollLabel || 'Roll a fresh offer';
    return {
      type: 'reroll',
      label: rerollLabel,
      reroll: ({ day = currentDay } = {}) =>
        rollDailyOffers({ templates: [definition], state: workingState, day, category: 'hustle' })
    };
  }

  definition.action = {
    label: config.actionLabel || 'Accept Offer',
    className: actionClassName,
    disabled: () => true,
    onClick: () => hooks.handleActionClick(),
    resolvePrimaryAction: resolvePrimaryOfferAction
  };
  definition.action.isLegacyInstant = true;
  definition.action.hiddenFromMarket = true;

  definition.getPrimaryOfferAction = resolvePrimaryOfferAction;
  definition.getDisabledReason = state => hooks.getDisabledReason(state);
  definition.reserveDailyUsage = state => hooks.reserveDailyUsage(state);
  definition.releaseDailyUsage = state => hooks.releaseDailyUsage(state);
  definition.consumeDailyUsage = state => hooks.consumeDailyUsage(state);

  if (typeof hooks.prepareCompletion === 'function') {
    definition.__prepareCompletion = ({ context, instance, state, completionHours }) =>
      hooks.prepareCompletion({ context, instance, state, completionHours });
  }

  definition.metricIds = {
    time: metadata.metrics.time?.key || null,
    cost: metadata.metrics.cost?.key || null,
    payout: metadata.metrics.payout?.key || null
  };
  definition.action.metricIds = definition.action.metricIds || metadata.metrics;

  return definition;
}
