import { formatHours, formatMoney } from '../../../core/helpers.js';
import { getActionDefinition } from '../../../core/state/registry.js';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function capitalize(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDay(value) {
  const numeric = toFiniteNumber(value);
  if (numeric == null || numeric <= 0) {
    return '—';
  }
  return `Day ${Math.max(1, Math.floor(numeric))}`;
}

function formatHoursValue(value) {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  return formatHours(numeric);
}

function formatMoneyValue(value) {
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

function buildInstanceSnapshot(instance = {}, { definition, index }) {
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

function buildActionBadges(definition, stateEntry) {
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

function summarizeActionInstanceCounts(entries) {
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

function collectActionSnapshots(state) {
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

function createBadge(doc, label, tone = 'neutral') {
  const badge = doc.createElement('span');
  badge.className = `developer-badge developer-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

function appendStatRow(doc, list, label, value) {
  if (value == null) {
    return;
  }
  const row = doc.createElement('div');
  row.className = 'developer-actions__stat';
  const dt = doc.createElement('dt');
  dt.textContent = label;
  const dd = doc.createElement('dd');
  dd.textContent = typeof value === 'string' ? value : String(value);
  row.append(dt, dd);
  list.appendChild(row);
}

function formatStatusLabel(status) {
  if (typeof status !== 'string' || status.length === 0) {
    return 'Unknown';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function mapStatusTone(status) {
  if (!status) {
    return 'status-unknown';
  }
  const normalized = status.toLowerCase();
  if (normalized === 'active') {
    return 'status-active';
  }
  if (normalized === 'completed') {
    return 'status-completed';
  }
  if (normalized === 'pending') {
    return 'status-pending';
  }
  return 'status-unknown';
}

function buildCountsSummary(counts) {
  if (!counts) {
    return null;
  }
  const parts = [`${counts.total} total`];
  Object.entries(counts.statuses || {}).forEach(([status, count]) => {
    parts.push(`${formatStatusLabel(status)} ${count}`);
  });
  return parts.join(' • ');
}

function renderActionStats(container, entries) {
  const statsSection = container.querySelector('#developer-actions-stats');
  const statsList = container.querySelector('[data-dev-actions-stats]');
  if (!statsSection || !statsList) {
    return;
  }

  const doc = statsList.ownerDocument || container.ownerDocument || document;
  statsList.innerHTML = '';

  if (!entries.length) {
    statsSection.hidden = true;
    return;
  }

  const summary = summarizeActionInstanceCounts(entries);
  appendStatRow(doc, statsList, 'Total instances', Math.max(0, Math.floor(summary.total)));

  Object.entries(summary.statuses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([status, count]) => {
      const label = formatStatusLabel(status);
      appendStatRow(doc, statsList, `${label} instances`, Math.max(0, Math.floor(count)));
    });

  statsSection.hidden = false;
}

function buildProgressHoursSummary(progress) {
  if (!progress) {
    return null;
  }
  const logged = formatHoursValue(progress.hoursLogged);
  const required = formatHoursValue(progress.hoursRequired);
  const remaining = formatHoursValue(progress.hoursRemaining);
  const segments = [];
  if (logged) {
    segments.push(required ? `${logged} logged of ${required}` : `${logged} logged`);
  } else if (required) {
    segments.push(`${required} required`);
  }
  if (remaining && progress.hoursRemaining > 0.05) {
    segments.push(`${remaining} remaining`);
  }
  return segments.length ? segments.join(' • ') : null;
}

function buildProgressDaysSummary(progress) {
  if (!progress) {
    return null;
  }
  const completed = toFiniteNumber(progress.daysCompleted);
  const required = toFiniteNumber(progress.daysRequired);
  const remaining = toFiniteNumber(progress.daysRemaining);
  const segments = [];
  if (completed != null) {
    const completedLabel = Math.max(0, Math.floor(completed));
    if (required != null) {
      segments.push(`${completedLabel}/${Math.max(0, Math.floor(required))} days`);
    } else {
      segments.push(`${completedLabel} days logged`);
    }
  } else if (required != null) {
    segments.push(`${Math.max(0, Math.floor(required))} day goal`);
  }
  if (remaining != null && required != null) {
    segments.push(`${Math.max(0, Math.floor(remaining))} days remaining`);
  }
  return segments.length ? segments.join(' • ') : null;
}

function renderActionInstance(doc, instance, index) {
  const item = doc.createElement('li');
  item.className = 'developer-actions__instance';

  const header = doc.createElement('div');
  header.className = 'developer-actions__instance-header';

  const titleGroup = doc.createElement('div');
  titleGroup.className = 'developer-actions__instance-title-group';

  const title = doc.createElement('p');
  title.className = 'developer-actions__instance-title';
  title.textContent = instance.displayName || `Instance ${index + 1}`;

  const id = doc.createElement('p');
  id.className = 'developer-actions__instance-id';
  id.textContent = instance.shortId;

  titleGroup.append(title, id);

  const badgeGroup = doc.createElement('div');
  badgeGroup.className = 'developer-actions__instance-badges';
  badgeGroup.appendChild(createBadge(doc, formatStatusLabel(instance.status), mapStatusTone(instance.status)));
  if (instance.progress?.completed) {
    badgeGroup.appendChild(createBadge(doc, 'Completed', 'status-completed'));
  } else if (instance.progress?.completion) {
    badgeGroup.appendChild(createBadge(doc, `Completion: ${instance.progress.completion}`, 'muted'));
  }

  header.append(titleGroup, badgeGroup);
  item.appendChild(header);

  const stats = doc.createElement('dl');
  stats.className = 'developer-actions__instance-stats';

  appendStatRow(doc, stats, 'Accepted', formatDay(instance.acceptedOnDay));
  appendStatRow(doc, stats, 'Deadline', formatDay(instance.deadlineDay));
  if (instance.progress?.completed || instance.completedOnDay != null) {
    appendStatRow(doc, stats, 'Completed on', formatDay(instance.completedOnDay));
  }
  if (instance.progress?.type) {
    appendStatRow(doc, stats, 'Progress type', `${capitalize(instance.progress.type)} track`);
  }
  if (instance.progress?.hoursPerDay != null) {
    const cadence = formatHoursValue(instance.progress.hoursPerDay);
    if (cadence) {
      appendStatRow(doc, stats, 'Daily cadence', `${cadence}/day`);
    }
  }
  const hoursSummary = buildProgressHoursSummary(instance.progress);
  if (hoursSummary) {
    appendStatRow(doc, stats, 'Hours', hoursSummary);
  }
  const daysSummary = buildProgressDaysSummary(instance.progress);
  if (daysSummary) {
    appendStatRow(doc, stats, 'Days', daysSummary);
  }
  if (instance.progress?.lastWorkedDay != null) {
    appendStatRow(doc, stats, 'Last worked', formatDay(instance.progress.lastWorkedDay));
  }
  if (instance.payoutAwarded != null) {
    const payout = formatMoneyValue(instance.payoutAwarded);
    if (payout) {
      appendStatRow(doc, stats, 'Payout awarded', payout);
    }
  }

  if (stats.children.length > 0) {
    item.appendChild(stats);
  }

  if (instance.notes) {
    const notes = doc.createElement('p');
    notes.className = 'developer-actions__instance-notes';
    notes.textContent = instance.notes;
    item.appendChild(notes);
  }

  if (Array.isArray(instance.progress?.logEntries) && instance.progress.logEntries.length) {
    const log = doc.createElement('div');
    log.className = 'developer-actions__instance-log';

    const logTitle = doc.createElement('p');
    logTitle.className = 'developer-actions__instance-log-title';
    logTitle.textContent = `Daily log (${instance.progress.logEntries.length})`;

    const logList = doc.createElement('ul');
    logList.className = 'developer-actions__instance-log-list';

    instance.progress.logEntries.forEach(entry => {
      const row = doc.createElement('li');
      row.className = 'developer-actions__instance-log-row';

      const day = doc.createElement('span');
      day.className = 'developer-actions__instance-log-day';
      day.textContent = `Day ${entry.day}`;

      const hours = doc.createElement('span');
      hours.className = 'developer-actions__instance-log-hours';
      hours.textContent = formatHoursValue(entry.hours) || '—';

      row.append(day, hours);
      logList.appendChild(row);
    });

    log.append(logTitle, logList);
    item.appendChild(log);
  }

  return item;
}

function renderActionEntry(doc, entry, index) {
  const item = doc.createElement('li');
  item.className = 'developer-actions__item';

  const header = doc.createElement('div');
  header.className = 'developer-actions__item-header';

  const titleGroup = doc.createElement('div');
  titleGroup.className = 'developer-actions__item-title-group';

  const title = doc.createElement('h3');
  title.className = 'developer-actions__item-title';
  title.textContent = entry.name || `Action ${index + 1}`;

  const id = doc.createElement('p');
  id.className = 'developer-actions__item-id';
  id.textContent = entry.id;

  titleGroup.append(title, id);
  header.appendChild(titleGroup);

  if (Array.isArray(entry.badges) && entry.badges.length) {
    const badgeGroup = doc.createElement('div');
    badgeGroup.className = 'developer-actions__badges';
    entry.badges.forEach(badge => {
      if (!badge || !badge.label) return;
      badgeGroup.appendChild(createBadge(doc, badge.label, badge.tone || 'neutral'));
    });
    header.appendChild(badgeGroup);
  }

  item.appendChild(header);

  if (entry.description) {
    const description = doc.createElement('p');
    description.className = 'developer-actions__description';
    description.textContent = entry.description;
    item.appendChild(description);
  }

  const stats = doc.createElement('dl');
  stats.className = 'developer-actions__stats';

  appendStatRow(doc, stats, 'Availability', entry.availability || '—');
  appendStatRow(doc, stats, 'Expiry', entry.expiry || '—');
  if (entry.progressTemplate) {
    appendStatRow(doc, stats, 'Progress template', entry.progressTemplate);
  }
  if (entry.baseTime != null) {
    const baseTime = formatHoursValue(entry.baseTime);
    if (baseTime) {
      appendStatRow(doc, stats, 'Base time cost', baseTime);
    }
  }
  if (entry.basePayout != null) {
    const basePayout = formatMoneyValue(entry.basePayout);
    if (basePayout) {
      appendStatRow(doc, stats, 'Base payout', basePayout);
    }
  }
  if (entry.runsToday != null) {
    appendStatRow(doc, stats, 'Runs today', Math.max(0, Math.floor(entry.runsToday)));
  }
  appendStatRow(doc, stats, 'Last run', formatDay(entry.lastRunDay));
  const countsSummary = buildCountsSummary(entry.counts);
  if (countsSummary) {
    appendStatRow(doc, stats, 'Instances', countsSummary);
  }

  if (stats.children.length > 0) {
    item.appendChild(stats);
  }

  const instancesContainer = doc.createElement('div');
  instancesContainer.className = 'developer-actions__instances';

  const instancesTitle = doc.createElement('h4');
  instancesTitle.className = 'developer-actions__instances-title';
  instancesTitle.textContent = 'Instances';
  instancesContainer.appendChild(instancesTitle);

  if (entry.instances.length) {
    const list = doc.createElement('ol');
    list.className = 'developer-actions__instance-list';
    entry.instances.forEach((instance, instanceIndex) => {
      list.appendChild(renderActionInstance(doc, instance, instanceIndex));
    });
    instancesContainer.appendChild(list);
  } else {
    const empty = doc.createElement('p');
    empty.className = 'developer-empty developer-actions__empty';
    empty.textContent = 'No action runs logged yet.';
    instancesContainer.appendChild(empty);
  }

  item.appendChild(instancesContainer);
  return item;
}

export function renderActionMemory(container, state) {
  const list = container.querySelector('#developer-actions-list');
  const empty = container.querySelector('#developer-actions-empty');
  if (!list) return;

  const doc = list.ownerDocument || container.ownerDocument || document;
  const entries = collectActionSnapshots(state);

  renderActionStats(container, entries);
  list.innerHTML = '';

  if (!entries.length) {
    if (empty) {
      empty.hidden = false;
    }
    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  entries.forEach((entry, index) => {
    list.appendChild(renderActionEntry(doc, entry, index));
  });
}

export default renderActionMemory;
