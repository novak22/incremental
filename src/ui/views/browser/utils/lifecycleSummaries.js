import { formatHours as baseFormatHours, formatMoney } from '../../../../core/helpers.js';

const defaultParseValue = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const defaultFormatDays = days => `${days} day${days === 1 ? '' : 's'}`;

const defaultFormatDailyHours = hours => `${hours}h per day`;

const defaultFormatSetupCost = cost => `$${cost} upfront`;

const defaultFormatUpkeepCost = cost => `$${cost} per day`;

const defaultCopy = {
  setupFallback: 'Instant',
  upkeepFallback: 'No upkeep required'
};

function normalizeCopy(config = {}) {
  const overrides = { ...config.copy };
  if (Object.prototype.hasOwnProperty.call(config, 'setupFallback')) {
    overrides.setupFallback = config.setupFallback;
  }
  if (Object.prototype.hasOwnProperty.call(config, 'upkeepFallback')) {
    overrides.upkeepFallback = config.upkeepFallback;
  }
  return { ...defaultCopy, ...overrides };
}

/**
 * Builds setup/upkeep describers with shared numeric parsing but themed labels.
 */
export function createLifecycleSummary(config = {}) {
  const {
    parseValue = defaultParseValue,
    formatSetupDays = defaultFormatDays,
    formatDailyHours = defaultFormatDailyHours,
    formatSetupHours = formatDailyHours,
    formatSetupCost = defaultFormatSetupCost,
    formatUpkeepHours = formatDailyHours,
    formatUpkeepCost = defaultFormatUpkeepCost
  } = config;

  const copy = normalizeCopy(config);

  const parse = value => {
    const parsed = parseValue(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function describeSetupSummary(setup = {}) {
    const days = parse(setup.days);
    const hoursPerDay = parse(setup.hoursPerDay);
    const cost = parse(setup.cost);
    const parts = [];

    if (days > 0) {
      parts.push(formatSetupDays(days));
    }

    if (hoursPerDay > 0) {
      parts.push(formatSetupHours(hoursPerDay));
    }

    if (cost > 0) {
      parts.push(formatSetupCost(cost));
    }

    return parts.length ? parts.join(' • ') : copy.setupFallback;
  }

  function describeUpkeepSummary(upkeep = {}) {
    const hours = parse(upkeep.hours);
    const cost = parse(upkeep.cost);
    const parts = [];

    if (hours > 0) {
      parts.push(formatUpkeepHours(hours));
    }

    if (cost > 0) {
      parts.push(formatUpkeepCost(cost));
    }

    return parts.length ? parts.join(' • ') : copy.upkeepFallback;
  }

  return {
    describeSetupSummary,
    describeUpkeepSummary,
    copy
  };
}

const defaultCurrencyCopy = {
  setupFallback: 'Instant launch',
  upkeepFallback: 'No upkeep required'
};

const defaultCurrencyFormatHours = hours => `${baseFormatHours(hours)} per day`;

const defaultCurrencyFormatMoney = value => `$${formatMoney(value)}`;

export function createCurrencyLifecycleSummary(options = {}) {
  const {
    formatCurrency = defaultCurrencyFormatMoney,
    formatDailyHours = defaultCurrencyFormatHours,
    formatSetupDays,
    formatSetupHours,
    formatUpkeepHours,
    formatSetupCost,
    formatUpkeepCost,
    copy,
    ...rest
  } = options;

  const resolvedCopy = { ...defaultCurrencyCopy, ...(copy || {}) };

  const describe = createLifecycleSummary({
    ...rest,
    formatSetupDays,
    formatSetupHours: formatSetupHours || (hours => formatDailyHours(hours)),
    formatUpkeepHours: formatUpkeepHours || (hours => formatDailyHours(hours)),
    formatSetupCost: formatSetupCost || (cost => `${formatCurrency(cost)} upfront`),
    formatUpkeepCost: formatUpkeepCost || (cost => `${formatCurrency(cost)} per day`),
    copy: resolvedCopy
  });

  return describe;
}

export default {
  createLifecycleSummary,
  createCurrencyLifecycleSummary
};
