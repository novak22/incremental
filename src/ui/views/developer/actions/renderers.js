import {
  capitalize,
  formatDay,
  formatHoursValue,
  formatMoneyValue,
  toFiniteNumber
} from './snapshots.js';

function createBadge(doc, label, tone = 'neutral') {
  const badge = doc.createElement('span');
  badge.className = `developer-badge developer-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

export function appendStatRow(doc, list, label, value) {
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

export function formatStatusLabel(status) {
  if (typeof status !== 'string' || status.length === 0) {
    return 'Unknown';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function mapStatusTone(status) {
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
      const hoursLabel = formatHoursValue(entry.hours);
      hours.textContent = hoursLabel ? `${hoursLabel} logged` : `${entry.hours} hours`;

      row.append(day, hours);
      logList.appendChild(row);
    });

    log.append(logTitle, logList);
    item.appendChild(log);
  }

  return item;
}

export function renderActionEntry(doc, entry, index) {
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

