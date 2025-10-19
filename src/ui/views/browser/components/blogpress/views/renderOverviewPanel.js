export default function renderOverviewPanel({ instance, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--overview';

  const header = document.createElement('header');
  header.className = 'blogpress-overview__header';

  const identity = document.createElement('div');
  identity.className = 'blogpress-overview__identity';

  const avatar = document.createElement('span');
  avatar.className = 'blogpress-overview__avatar';
  avatar.textContent = instance.icon || '📰';
  identity.appendChild(avatar);

  const titleGroup = document.createElement('div');
  titleGroup.className = 'blogpress-overview__title-group';

  const title = document.createElement('h2');
  title.textContent = instance.label;
  titleGroup.appendChild(title);

  const tags = document.createElement('div');
  tags.className = 'blogpress-overview__tags';

  if (instance.niche?.name) {
    const nicheTag = document.createElement('span');
    nicheTag.className = 'blogpress-overview__niche';
    nicheTag.textContent = instance.niche.name;
    if (instance.niche.label) {
      nicheTag.dataset.tone = instance.niche.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    tags.appendChild(nicheTag);
  }

  const statusBadge = document.createElement('span');
  statusBadge.className = `blogpress-badge blogpress-badge--${instance.status?.id || 'setup'}`;
  statusBadge.textContent = instance.status?.label || 'Setup';
  tags.appendChild(statusBadge);

  if (tags.children.length > 0) {
    titleGroup.appendChild(tags);
  }

  identity.appendChild(titleGroup);
  header.appendChild(identity);

  const statusCluster = document.createElement('div');
  statusCluster.className = 'blogpress-overview__status-cluster';

  const health = document.createElement('span');
  health.className = 'blogpress-overview__health';

  const milestoneReady = (instance.milestone?.percent || 0) >= 1;
  const upkeepDue = Boolean(instance.maintenance?.hasUpkeep) && !instance.maintenanceFunded;
  const isActive = instance.status?.id === 'active';

  if (!isActive) {
    health.dataset.tone = 'idle';
    health.textContent = 'Launch prep underway';
  } else if (upkeepDue) {
    health.dataset.tone = 'warn';
    health.textContent = 'Upkeep due today';
  } else if (milestoneReady) {
    health.dataset.tone = 'boost';
    health.textContent = 'Milestone ready 🚀';
  } else {
    health.dataset.tone = 'ready';
    health.textContent = "Your blog's purring along";
  }

  statusCluster.appendChild(health);

  const timeline = document.createElement('span');
  timeline.className = 'blogpress-overview__timeline';
  const daysActive = Math.max(0, Number(instance.daysActive) || 0);
  if (daysActive > 0) {
    timeline.textContent = daysActive === 1 ? 'Live for 1 day' : `Live for ${daysActive} days`;
  } else {
    timeline.textContent = 'Pre-launch — day 0';
  }
  statusCluster.appendChild(timeline);

  header.appendChild(statusCluster);

  panel.appendChild(header);

  const mood = document.createElement('p');
  mood.className = 'blogpress-overview__mood';
  if (!isActive) {
    mood.textContent = 'Warm up the engines — content calendar is almost ready.';
  } else if (upkeepDue) {
    mood.textContent = 'Trend dip — keep posting and cover upkeep to stay in rhythm.';
  } else if (milestoneReady) {
    mood.textContent = 'Milestone ready 🚀 — cash in the glow before the next sprint.';
  } else {
    mood.textContent = 'Daily cadence locked. Keep the posts flowing and ride the momentum.';
  }

  panel.appendChild(mood);

  const list = document.createElement('dl');
  list.className = 'blogpress-stats blogpress-stats--compact';

  const stats = [
    {
      label: 'Lifetime income',
      value: formatCurrency(instance.lifetimeIncome)
    },
    {
      label: 'Lifetime spend',
      value: formatCurrency(instance.estimatedSpend)
    },
    {
      label: 'Latest payout',
      value: instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : 'None yet'
    },
    {
      label: 'Daily average',
      value: instance.averagePayout > 0 ? formatCurrency(instance.averagePayout) : '$0'
    },
    {
      label: 'Pending payout',
      value: instance.pendingIncome > 0 ? formatCurrency(instance.pendingIncome) : 'None in queue'
    },
    instance.daysActive > 0
      ? {
          label: 'Days live',
          value: instance.daysActive === 1 ? '1 day' : `${instance.daysActive} days`
        }
      : null
  ].filter(Boolean);

  stats.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    list.append(dt, dd);
  });

  panel.appendChild(list);
  return panel;
}
