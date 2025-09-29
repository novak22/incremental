import { formatHours, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetDefinition, getAssetState, getState, getUpgradeDefinition, getUpgradeState } from '../../core/state.js';
import { executeAction } from '../actions.js';
import { addMoney, spendMoney } from '../currency.js';
import { checkDayEnd } from '../lifecycle.js';
import { recordCostContribution, recordPayoutContribution, recordTimeContribution } from '../metrics.js';
import { renderAssetRequirementDetail, updateAssetCardLock } from '../requirements.js';
import { spendTime } from '../time.js';
import { awardSkillProgress } from '../skills/index.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
  setupCostDetail,
  setupDetail
} from '../assets/helpers.js';
import {
  applyInstantHustleEducationBonus,
  describeInstantHustleEducationBonuses,
  formatEducationBonusSummary
} from '../educationEffects.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatHourDetail(hours) {
  if (!hours) return '⏳ Time: <strong>Instant</strong>';
  return `⏳ Time: <strong>${formatHours(hours)}</strong>`;
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

function countActiveAssets(assetId) {
  if (!assetId) return 0;
  const state = getAssetState(assetId);
  if (!state?.instances?.length) return 0;
  return state.instances.filter(instance => instance.status === 'active').length;
}

function renderRequirementSummary(requirements = []) {
  if (!requirements.length) return 'None';
  return requirements
    .map(req => {
      const definition = getAssetDefinition(req.assetId);
      const label = definition?.singular || definition?.name || req.assetId;
      const need = asNumber(req.count, 1);
      const have = countActiveAssets(req.assetId);
      return `${label}: ${have}/${need} active`;
    })
    .join(' • ');
}

function requirementsMet(requirements = []) {
  if (!requirements?.length) return true;
  return requirements.every(req => countActiveAssets(req.assetId) >= asNumber(req.count, 1));
}

function buildMetricConfig(id, prefix, overrides = {}, defaults = {}) {
  if (overrides === false) return null;
  const key = overrides.key || defaults.key || `${prefix}:${id}:${defaults.type || prefix}`;
  const label = overrides.label || defaults.label;
  const category = overrides.category || defaults.category;
  return { key, label, category };
}

export function createAssetDefinition(config) {
  const definition = {
    ...config,
    type: 'asset',
    defaultState: config.defaultState || { instances: [] }
  };

  const detailKeys = config.detailKeys || [
    'owned',
    'setup',
    'setupCost',
    'maintenance',
    'requirements',
    'qualitySummary',
    'qualityProgress',
    'income',
    'latestYield'
  ];

  const builders = {
    owned: () => ownedDetail(definition),
    setup: () => setupDetail(definition),
    setupCost: () => setupCostDetail(definition),
    maintenance: () => maintenanceDetail(definition),
    requirements: () => renderAssetRequirementDetail(definition.id),
    qualitySummary: () => qualitySummaryDetail(definition),
    qualityProgress: () => qualityProgressDetail(definition),
    income: () => incomeDetail(definition),
    latestYield: () => latestYieldDetail(definition)
  };

  definition.details = detailKeys
    .map(detail => {
      if (typeof detail === 'function') {
        return () => detail(definition);
      }
      if (typeof detail === 'string' && builders[detail]) {
        return () => builders[detail]();
      }
      return () => detail;
    })
    .concat((config.details || []).map(detail => () => detail(definition)));

  definition.action = buildAssetAction(definition, config.actionLabels);

  if (config.lockCard !== false) {
    definition.cardState = (_state, card) => updateAssetCardLock(definition.id, card);
  }

  return definition;
}

function normalizeHustleMetrics(id, metrics = {}) {
  return {
    time: buildMetricConfig(id, 'hustle', metrics.time, {
      key: `hustle:${id}:time`,
      label: metrics.time?.label || 'Hustle time investment',
      category: metrics.time?.category || 'hustle'
    }),
    cost: buildMetricConfig(id, 'hustle', metrics.cost, {
      key: `hustle:${id}:cost`,
      label: metrics.cost?.label || 'Hustle spending',
      category: metrics.cost?.category || 'hustle'
    }),
    payout: buildMetricConfig(id, 'hustle', metrics.payout, {
      key: `hustle:${id}:payout`,
      label: metrics.payout?.label || 'Hustle payout',
      category: metrics.payout?.category || 'hustle'
    })
  };
}

function applyMetric(recordFn, metric, payload) {
  if (!metric) return;
  recordFn({ ...metric, ...payload });
}

export function createInstantHustle(config) {
  const metadata = {
    id: config.id,
    time: asNumber(config.time, 0),
    cost: asNumber(config.cost, 0),
    requirements: config.requirements || [],
    payout: config.payout
      ? {
          amount: asNumber(config.payout.amount, 0),
          delaySeconds: asNumber(config.payout.delaySeconds, 0) || undefined,
          grantOnAction: config.payout.grantOnAction !== false,
          logType: config.payout.logType || 'hustle',
          message: config.payout.message
        }
      : null,
    metrics: normalizeHustleMetrics(config.id, config.metrics || {}),
    skills: config.skills
  };

  const definition = {
    ...config,
    type: 'hustle',
    tag: config.tag || { label: 'Instant', type: 'instant' },
    defaultState: config.defaultState || {},
    skills: metadata.skills
  };

  const baseDetails = [];
  if (metadata.time > 0) {
    baseDetails.push(() => formatHourDetail(metadata.time));
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
    baseDetails.push(() => `Requires: <strong>${renderRequirementSummary(metadata.requirements)}</strong>`);
  }

  const educationDetails = describeInstantHustleEducationBonuses(config.id);

  definition.details = [...baseDetails, ...educationDetails, ...(config.details || [])];

  const actionClassName = config.actionClassName || 'primary';

  function getDisabledReason(state) {
    if (metadata.time > 0 && state.timeLeft < metadata.time) {
      return `You need at least ${formatHours(metadata.time)} free before starting ${definition.name}.`;
    }
    if (metadata.cost > 0 && state.money < metadata.cost) {
      return `You need $${formatMoney(metadata.cost)} before funding ${definition.name}.`;
    }
    if (!requirementsMet(metadata.requirements)) {
      return `You still need: ${renderRequirementSummary(metadata.requirements)}.`;
    }
    return null;
  }

  function runHustle(context) {
    if (metadata.time > 0) {
      spendTime(metadata.time);
      applyMetric(recordTimeContribution, metadata.metrics.time, { hours: metadata.time });
    }
    if (metadata.cost > 0) {
      spendMoney(metadata.cost);
      applyMetric(recordCostContribution, metadata.metrics.cost, { amount: metadata.cost });
    }

    context.skipDefaultPayout = () => {
      context.__skipDefaultPayout = true;
    };

    config.onExecute?.(context);

    if (metadata.skills) {
      context.skillXpAwarded = awardSkillProgress({
        skills: metadata.skills,
        timeSpentHours: metadata.time,
        moneySpent: metadata.cost,
        label: definition.name
      });
    }

    if (metadata.payout && metadata.payout.grantOnAction && !context.__skipDefaultPayout) {
      const basePayout = metadata.payout.amount;
      const { amount: finalPayout, applied: appliedBonuses } = applyInstantHustleEducationBonus({
        hustleId: metadata.id,
        baseAmount: basePayout,
        state: context.state
      });

      context.basePayout = basePayout;
      context.finalPayout = finalPayout;
      context.appliedEducationBoosts = appliedBonuses;
      context.payoutGranted = finalPayout;

      const template = metadata.payout.message;
      let message;
      if (typeof template === 'function') {
        message = template(context);
      } else if (template) {
        message = template;
      } else {
        const bonusNote = appliedBonuses.length ? ' Education bonus included!' : '';
        message = `${definition.name} paid $${formatMoney(finalPayout)}.${bonusNote}`;
      }

      addMoney(finalPayout, message, metadata.payout.logType);
      applyMetric(recordPayoutContribution, metadata.metrics.payout, { amount: finalPayout });

      if (appliedBonuses.length) {
        const summary = formatEducationBonusSummary(appliedBonuses);
        if (summary) {
          addLog(`Your studies kicked in: ${summary}.`, 'info');
        }
      }
    }

    config.onComplete?.(context);
  }

  definition.action = {
    label: config.actionLabel || 'Run Hustle',
    className: actionClassName,
    disabled: () => {
      const state = getState();
      if (!state) return true;
      return Boolean(getDisabledReason(state));
    },
    onClick: () => {
      executeAction(() => {
        const state = getState();
        if (!state) return;
        const reason = getDisabledReason(state);
        if (reason) {
          addLog(reason, 'warning');
          return;
        }
        const context = {
          definition,
          metadata,
          state,
          payoutGranted: 0,
          __skipDefaultPayout: false
        };
        runHustle(context);
      });
      checkDayEnd();
    }
  };

  definition.metricIds = {
    time: metadata.metrics.time?.key || null,
    cost: metadata.metrics.cost?.key || null,
    payout: metadata.metrics.payout?.key || null
  };
  definition.action.metricIds = definition.action.metricIds || metadata.metrics;

  return definition;
}

function normalizeUpgradeRequirements(config = []) {
  return config.map(req => {
    if (typeof req === 'string') {
      return { type: 'upgrade', id: req };
    }
    return req;
  });
}

function upgradeRequirementMet(requirement) {
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const state = getAssetState(requirement.id);
      const instances = state?.instances || [];
      if (requirement.active) {
        return instances.filter(instance => instance.status === 'active').length >= asNumber(requirement.count, 1);
      }
      return instances.length >= asNumber(requirement.count, 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

function renderUpgradeRequirement(requirement) {
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const definition = getUpgradeDefinition(requirement.id);
      const label = definition?.name || requirement.id;
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || requirement.id;
      const count = asNumber(requirement.count, 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

function upgradeRequirementsMet(requirements) {
  if (!requirements?.length) return true;
  return requirements.every(req => upgradeRequirementMet(req));
}

export function createUpgrade(config) {
  const requirements = normalizeUpgradeRequirements(config.requires || []);
  const definition = {
    ...config,
    type: 'upgrade',
    defaultState: config.defaultState || { purchased: false }
  };
  definition.requirements = requirements;

  const details = [];
  if (config.cost) {
    details.push(() => `💵 Cost: <strong>$${formatMoney(config.cost)}</strong>`);
  }
  requirements.forEach(requirement => {
    details.push(() => renderUpgradeRequirement(requirement));
  });
  if (config.unlocks) {
    details.push(() => `Unlocks: <strong>${config.unlocks}</strong>`);
  }
  if (config.boosts) {
    details.push(() => `Boosts: <strong>${config.boosts}</strong>`);
  }
  definition.details = [...details, ...(config.details || [])];

  const costMetric = buildMetricConfig(config.id, 'upgrade', config.metrics?.cost, {
    key: `upgrade:${config.id}`,
    label: config.metrics?.cost?.label || `${config.name} purchase`,
    category: config.metrics?.cost?.category || 'upgrade',
    type: 'cost'
  });

  const getContext = () => {
    const state = getState();
    const upgradeState = getUpgradeState(config.id);
    const missing = requirements.filter(req => !upgradeRequirementMet(req));
    return {
      definition,
      state,
      upgradeState,
      requirements,
      missing
    };
  };

  const actionConfig = {
    className: config.actionClassName || 'secondary',
    label: config.actionLabel,
    labels: config.labels || {}
  };

  function computeLabel(context) {
    const fallback = `Purchase ${definition.name}`;
    if (!context.state) {
      if (typeof actionConfig.label === 'function') {
        return actionConfig.label(context) || fallback;
      }
      return actionConfig.label || fallback;
    }
    if (!config.repeatable && context.upgradeState?.purchased) {
      const purchasedLabel = actionConfig.labels.purchased;
      if (typeof purchasedLabel === 'function') {
        return purchasedLabel(context) || `${definition.name} Ready`;
      }
      return purchasedLabel || `${definition.name} Ready`;
    }
    if (context.missing.length) {
      const missingLabel = actionConfig.labels.missing;
      if (typeof missingLabel === 'function') {
        return missingLabel(context) || 'Requires Prerequisite';
      }
      return missingLabel || 'Requires Prerequisite';
    }
    if (typeof actionConfig.label === 'function') {
      return actionConfig.label(context) || fallback;
    }
    return actionConfig.label || fallback;
  }

  function isDisabled(context) {
    if (!context.state) return true;
    if (!config.repeatable && context.upgradeState?.purchased) return true;
    if (context.missing.length) return true;
    if (config.cost && context.state.money < config.cost) return true;
    if (typeof config.disabled === 'function' && config.disabled(context)) return true;
    return false;
  }

  definition.action = {
    label: () => {
      const context = getContext();
      return computeLabel(context);
    },
    className: actionConfig.className,
    disabled: () => {
      const context = getContext();
      return isDisabled(context);
    },
    onClick: () => {
      executeAction(() => {
        const context = getContext();
        if (!context.state) return;
        if (isDisabled(context)) {
          addLog(config.blockedMessage || 'You still need to meet the requirements first.', 'warning');
          return;
        }
        if (config.cost) {
          spendMoney(config.cost);
          applyMetric(recordCostContribution, costMetric, { amount: config.cost });
        }
        if (!config.repeatable) {
          context.upgradeState.purchased = true;
        }
        const skillLabel = typeof definition.name === 'string' ? definition.name : config.id;
        const skillXp = awardSkillProgress({
          skills: config.skills,
          moneySpent: config.cost,
          label: skillLabel,
          state: context.state
        });
        context.skillXpAwarded = skillXp;
        config.onPurchase?.(context);
        if (config.logMessage) {
          addLog(
            typeof config.logMessage === 'function' ? config.logMessage(context) : config.logMessage,
            config.logType || 'upgrade'
          );
        }
      });
      checkDayEnd();
    }
  };

  if (config.cardState || config.lockCard !== false) {
    definition.cardState = (state, card) => {
      if (typeof config.cardState === 'function') {
        config.cardState(state, card, {
          requirements,
          definition
        });
        return;
      }
      if (!card) return;
      const context = getContext();
      card.classList.toggle('locked', !config.repeatable && Boolean(context.upgradeState?.purchased));
      card.classList.toggle('requires-upgrade', context.missing.length > 0);
    };
  }

  if (config.extraContent) {
    definition.extraContent = config.extraContent;
  }
  if (config.update) {
    definition.update = config.update;
  }
  if (config.process) {
    definition.process = config.process;
  }

  return definition;
}

export function renderHustleRequirementSummary(requirements) {
  return renderRequirementSummary(requirements);
}

export function hustleRequirementsMet(requirements) {
  return requirementsMet(requirements);
}
