const defaultParseValue = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const defaultFormatDays = days => `${days} day${days === 1 ? '' : 's'}`;

const defaultFormatDailyHours = hours => `${hours}h per day`;

const defaultFormatSetupCost = cost => `$${cost} upfront`;

const defaultFormatUpkeepCost = cost => `$${cost} per day`;

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
    formatUpkeepCost = defaultFormatUpkeepCost,
    setupFallback = 'Instant',
    upkeepFallback = 'No upkeep required',
    setupJoiner = ' • ',
    upkeepJoiner = ' • '
  } = config;

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

    return parts.length ? parts.join(setupJoiner) : setupFallback;
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

    return parts.length ? parts.join(upkeepJoiner) : upkeepFallback;
  }

  return {
    describeSetupSummary,
    describeUpkeepSummary
  };
}

function resolveHoursFormatter({
  baseFormatter,
  suffix,
  customFormatter
}) {
  if (typeof customFormatter === 'function') {
    return hours => customFormatter(hours, { formatHoursValue: baseFormatter });
  }
  const resolvedSuffix = typeof suffix === 'string' ? suffix : ' per day';
  return hours => `${baseFormatter(hours)}${resolvedSuffix}`;
}

export function createDailyLifecycleSummary(themeConfig = {}) {
  const {
    parseValue = defaultParseValue,
    formatSetupDays,
    formatHoursValue,
    formatSetupHours,
    formatUpkeepHours,
    setupHoursSuffix = ' per day',
    upkeepHoursSuffix = ' per day',
    formatSetupCost,
    formatUpkeepCost,
    setupFallback = 'Instant launch',
    upkeepFallback = 'No upkeep required',
    setupJoiner,
    upkeepJoiner
  } = themeConfig;

  const baseHoursFormatter =
    typeof formatHoursValue === 'function'
      ? value => formatHoursValue(value)
      : value => `${defaultParseValue(value)}h`;

  const resolvedSetupHours = resolveHoursFormatter({
    baseFormatter: baseHoursFormatter,
    suffix: setupHoursSuffix,
    customFormatter: formatSetupHours
  });

  const resolvedUpkeepHours = resolveHoursFormatter({
    baseFormatter: baseHoursFormatter,
    suffix: upkeepHoursSuffix,
    customFormatter: formatUpkeepHours
  });

  return createLifecycleSummary({
    parseValue,
    formatSetupDays,
    formatSetupHours: resolvedSetupHours,
    formatUpkeepHours: resolvedUpkeepHours,
    formatSetupCost,
    formatUpkeepCost,
    setupFallback,
    upkeepFallback,
    setupJoiner,
    upkeepJoiner
  });
}

export default {
  createLifecycleSummary,
  createDailyLifecycleSummary
};
