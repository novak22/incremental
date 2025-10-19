export default function renderOverviewPanel({ instance, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--overview';

  const header = document.createElement('div');
  header.className = 'blogpress-overview__header';

  const title = document.createElement('h2');
  title.textContent = instance.label;
  header.appendChild(title);

  const badge = document.createElement('span');
  badge.className = `blogpress-badge blogpress-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  header.appendChild(badge);

  panel.appendChild(header);

  const list = document.createElement('dl');
  list.className = 'blogpress-stats blogpress-stats--compact';

  const postsPublished = Math.max(0, Math.round(Number(instance?.posts?.published) || 0));
  const seoScore = Math.max(0, Math.min(100, Math.round(Number(instance?.seo?.score) || 0)));
  const seoGrade = instance?.seo?.grade || 'F';
  const backlinkScore = Math.max(1, Math.min(5, Math.round(Number(instance?.backlinks?.score) || 1)));
  const backlinkCount = Math.max(0, Math.round(Number(instance?.backlinks?.count) || 0));
  const backlinkNext = Number.isFinite(Number(instance?.backlinks?.nextTarget))
    ? Math.max(0, Math.round(Number(instance.backlinks.nextTarget)))
    : null;
  const backlinkDetails = backlinkNext && backlinkNext > backlinkCount
    ? `${backlinkScore}/5 (${backlinkCount} link${backlinkCount === 1 ? '' : 's'}) · Next at ${backlinkNext}`
    : `${backlinkScore}/5 (${backlinkCount} link${backlinkCount === 1 ? '' : 's'})`;

  const stats = [
    {
      label: 'Posts published',
      value: postsPublished === 1 ? '1 post' : `${postsPublished} posts`
    },
    {
      label: 'SEO grade',
      value: `${seoGrade} (${seoScore}%)`
    },
    {
      label: 'Backlink rank',
      value: backlinkDetails
    },
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
