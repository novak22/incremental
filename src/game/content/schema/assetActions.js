import { toNumber } from '../../../core/helpers.js';
import { normalizeHustleMetrics } from './metrics.js';
import { createContractTemplate } from '../../actions/templates/contract.js';
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

  const { resolveDailyUsage, updateDailyUsage } = createDailyLimitTracker(metadata);

  const progressDefaults = buildProgressDefaults({ metadata, config });

  const baseDefinition = {
    ...config,
    type: 'hustle',
    tag: config.tag || { label: 'Instant', type: 'instant' },
    defaultState: buildDefaultState({ config, metadata }),
    dailyLimit: metadata.dailyLimit,
    skills: metadata.skills,
    progress: config.progress,
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
  if (typeof config.onAccept === 'function') {
    acceptHooks.push(config.onAccept);
  }

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
    }
  });

  definition.tags = Array.isArray(config.tags) ? config.tags.slice() : [];

  const hooks = createExecutionHooks({
    definition,
    metadata,
    config,
    resolveDailyUsage,
    updateDailyUsage
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

  definition.action = {
    label: config.actionLabel || 'Run Hustle',
    className: actionClassName,
    disabled: hooks.disabled,
    onClick: hooks.handleActionClick
  };
  definition.action.isLegacyInstant = true;
  definition.action.hiddenFromMarket = true;

  definition.metricIds = {
    time: metadata.metrics.time?.key || null,
    cost: metadata.metrics.cost?.key || null,
    payout: metadata.metrics.payout?.key || null
  };
  definition.action.metricIds = definition.action.metricIds || metadata.metrics;

  return definition;
}
