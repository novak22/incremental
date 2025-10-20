import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getActionDefinition } from '../../../../core/state/registry.js';

export function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function capitalize(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDay(value) {
  const numeric = toFiniteNumber(value);
  if (numeric == null || numeric <= 0) {
    return '—';
  }
  return `Day ${Math.max(1, Math.floor(numeric))}`;
}

export function formatHoursValue(value) {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  return formatHours(numeric);
}

export function formatMoneyValue(value) {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  return `$${formatMoney(numeric)}`;
}

function describeAvailability(availability) {
  if (!availability || typeof availability !== 'object') {
    return 'Always available';
  }

  const type = availability.type;
  if (!type || type === 'always') {
    return 'Always available';
  }

  if (type === 'dailyLimit') {
    const limit = toFiniteNumber(availability.limit);
    return limit != null ? `Daily cap ${limit}` : 'Daily limited';
  }

  if (type === 'enrollable') {
    return 'Requires enrollment';
  }

  const extras = Object.entries(availability)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => `${capitalize(key)}: ${value}`)
    .join(' • ');
  const base = `${capitalize(type)} availability`;
  return extras ? `${base} (${extras})` : base;
}

function describeExpiry(expiry) {
  if (!expiry || typeof expiry !== 'object') {
    return 'Permanent';
  }

  const type = expiry.type;
  if (!type || type === 'permanent') {
    return 'Permanent';
  }

  const extras = Object.entries(expiry)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => `${capitalize(key)}: ${value}`)
    .join(' • ');
  const base = `${capitalize(type)} expiry`;
  return extras ? `${base} (${extras})` : base;
}

function describeProgressTemplate(progress) {
  if (!progress || typeof progress !== 'object') {
    return 'Instant (no tracking)';
  }

  const parts = [];
  if (progress.type) {
    parts.push(`${capitalize(progress.type)} progress`);
  }
  if (progress.completion) {
    parts.push(`Completion: ${progress.completion}`);
  }
  const required = formatHoursValue(progress.hoursRequired);
  if (required) {
    parts.push(`${required} required`);
  }
  const cadence = formatHoursValue(progress.hoursPerDay);
  if (cadence) {
    parts.push(`${cadence}/day`);
  }
  const daysRequired = toFiniteNumber(progress.daysRequired);
  if (daysRequired != null) {
    parts.push(`${Math.max(0, Math.floor(daysRequired))} day goal`);
  }
  return parts.length ? parts.join(' • ') : 'Instant (no tracking)';
}

function normalizeDailyLog(log) {
  if (!log || typeof log !== 'object') {
    return [];
  }

  return Object.entries(log)
    .map(([dayKey, hoursValue]) => {
      const day = toFiniteNumber(dayKey);
      const hours = toFiniteNumber(hoursValue);
      if (day == null || hours == null) {
        return null;
      }
      return {
        day: Math.max(1, Math.floor(day)),
        hours
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day);
}

export function buildInstanceSnapshot(instance = {}, { definition, index }) {
  const identifier = typeof instance.id === 'string' && instance.id ? instance.id : `instance-${index + 1}`;
  const displayName = instance.nickname || instance.label || `Instance ${index + 1}`;
  const statusSource = typeof instance.status === 'string' ? instance.status.toLowerCase() : null;
  const accepted = instance.accepted === true || statusSource === 'active' || statusSource === 'completed';
  const completed = instance.completed === true || statusSource === 'completed';
  const status = statusSource || (completed ? 'completed' : accepted ? 'active' : 'pending');

  const acceptedOnDay = toFiniteNumber(instance.acceptedOnDay);
  const deadlineDay = toFiniteNumber(instance.deadlineDay);
  const completedOn = completed ? toFiniteNumber(instance.completedOnDay) : null;
  const resolvedCompletedOn = completedOn != null ? completedOn : completed && acceptedOnDay != null ? acceptedOnDay : null;
  const payoutAwarded = toFiniteNumber(instance.payoutAwarded);

  const progressSource = typeof instance.progress === 'object' && instance.progress !== null ? instance.progress : {};
  const hoursLogged = toFiniteNumber(progressSource.hoursLogged ?? instance.hoursLogged);
  const definitionHoursRequired = definition?.progress?.hoursRequired;
  const hoursRequired = toFiniteNumber(progressSource.hoursRequired ?? instance.hoursRequired ?? definitionHoursRequired);
  let hoursRemaining = null;
  if (hoursRequired != null && hoursLogged != null) {
    hoursRemaining = Math.max(0, hoursRequired - hoursLogged);
  }
  const hoursPerDay = toFiniteNumber(progressSource.hoursPerDay ?? definition?.progress?.hoursPerDay);
  const daysCompleted = toFiniteNumber(progressSource.daysCompleted);
  const definitionDaysRequired = definition?.progress?.daysRequired;
  const daysRequired = toFiniteNumber(progressSource.daysRequired ?? definitionDaysRequired);
  let daysRemaining = null;
  if (daysRequired != null) {
    const completedDays = Math.max(0, Math.floor(daysCompleted ?? 0));
    daysRemaining = Math.max(0, Math.floor(daysRequired) - completedDays);
  }
  const lastWorkedDay = toFiniteNumber(progressSource.lastWorkedDay);
  const completionMode = progressSource.completion || definition?.progress?.completion || null;
  const logEntries = normalizeDailyLog(progressSource.dailyLog);

  const notes = Array.isArray(instance.notes)
    ? instance.notes.map(entry => String(entry)).join(' ')
    : instance.notes != null
      ? String(instance.notes)
      : '';

  return {
    id: identifier,
    shortId: identifier.slice(0, 8),
    displayName,
    status,
    acceptedOnDay,
    deadlineDay,
    completedOnDay: resolvedCompletedOn,
    payoutAwarded,
    notes,
    progress: {
      type: progressSource.type || definition?.progress?.type || null,
      completion: completionMode,
      hoursLogged,
      hoursRequired,
      hoursRemaining,
      hoursPerDay,
      daysCompleted,
      daysRequired,
      daysRemaining,
      lastWorkedDay,
      completed,
      logEntries
    }
  };
}

function countInstanceStatuses(instances) {
  const counts = { total: instances.length, statuses: {} };
  instances.forEach(instance => {
    const status = typeof instance.status === 'string' && instance.status ? instance.status : 'unknown';
    counts.statuses[status] = (counts.statuses[status] || 0) + 1;
  });
  return counts;
}

export function buildActionBadges(definition, stateEntry) {
  const badges = [];
  if (definition?.tag?.label) {
    const tone = definition?.tag?.type === 'instant' ? 'accent' : 'neutral';
    badges.push({ label: definition.tag.label, tone });
  }
  const progressType = definition?.progress?.type;
  if (progressType) {
    badges.push({ label: `${capitalize(progressType)} track`, tone: 'muted' });
  }
  const availabilityType = definition?.availability?.type || stateEntry?.availability?.type;
  if (availabilityType === 'dailyLimit') {
    const limit = toFiniteNumber(definition?.availability?.limit ?? stateEntry?.availability?.limit);
    badges.push({ label: limit != null ? `Cap ${limit}/day` : 'Daily limited', tone: 'neutral' });
  } else if (availabilityType === 'enrollable') {
    badges.push({ label: 'Enrollment required', tone: 'neutral' });
  } else if (availabilityType && availabilityType !== 'always') {
    badges.push({ label: capitalize(availabilityType), tone: 'neutral' });
  }
  return badges;
}

export function summarizeActionInstanceCounts(entries) {
  return entries.reduce(
    (summary, entry) => {
      const counts = entry?.counts;
      if (!counts) {
        return summary;
      }

      summary.total += Number(counts.total) || 0;
      Object.entries(counts.statuses || {}).forEach(([status, count]) => {
        const normalized = typeof status === 'string' ? status : 'unknown';
        summary.statuses[normalized] = (summary.statuses[normalized] || 0) + (Number(count) || 0);
      });
      return summary;
    },
    { total: 0, statuses: {} }
  );
}

export function collectActionSnapshots(state) {
  const slice = state?.actions;
  if (!slice || typeof slice !== 'object') {
    return [];
  }

  return Object.entries(slice)
    .map(([id, entry]) => {
      if (!entry) {
        return null;
      }
      const definition = getActionDefinition(id);
      const name = definition?.name || entry?.name || id;
      const description = definition?.description || '';
      const runsToday = toFiniteNumber(entry.runsToday);
      const lastRunDay = toFiniteNumber(entry.lastRunDay);
      const instances = Array.isArray(entry.instances)
        ? entry.instances.map((instance, index) => buildInstanceSnapshot(instance, { definition, index }))
        : [];
      const counts = countInstanceStatuses(instances);
      const availability = describeAvailability(definition?.availability || entry?.availability);
      const expiry = describeExpiry(definition?.expiry || entry?.expiry);
      const progressTemplate = describeProgressTemplate(definition?.progress);
      const baseTimeCost = toFiniteNumber(definition?.time ?? definition?.action?.timeCost);
      const basePayout = toFiniteNumber(
        definition?.payout?.amount ?? definition?.action?.payout?.amount ?? entry?.payout?.amount
      );
      const badges = buildActionBadges(definition, entry);
      return {
        id,
        name,
        description,
        runsToday,
        lastRunDay,
        instances,
        counts,
        availability,
        expiry,
        progressTemplate,
        baseTime: baseTimeCost,
        basePayout,
        badges
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

