export default function renderQualityPanel({ instance, formatRange }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--performance';

  const title = document.createElement('h3');
  title.textContent = 'Performance';
  panel.appendChild(title);

  const stage = document.createElement('div');
  stage.className = 'blogpress-performance__stage';
  const stageLabel = document.createElement('span');
  stageLabel.className = 'blogpress-performance__stage-label';
  stageLabel.textContent = instance.qualityInfo?.name || 'Skeleton Drafts';
  const stageMeta = document.createElement('span');
  stageMeta.className = 'blogpress-performance__stage-meta';
  stageMeta.textContent = `Stage ${instance.qualityLevel}`;
  stage.append(stageLabel, stageMeta);
  panel.appendChild(stage);

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

  const stats = document.createElement('dl');
  stats.className = 'blogpress-stats blogpress-stats--compact blogpress-performance__stats';
  const entries = [
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
    }
  ];
  entries.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    stats.append(dt, dd);
  });
  panel.appendChild(stats);

  const progress = document.createElement('div');
  progress.className = 'blogpress-progress blogpress-performance__progress';
  const fill = document.createElement('div');
  fill.className = 'blogpress-progress__fill';
  fill.style.width = `${Math.round((instance.milestone.percent || 0) * 100)}%`;
  progress.appendChild(fill);
  panel.appendChild(progress);

  const status = document.createElement('div');
  status.className = 'blogpress-performance__status';
  const statusIcon = document.createElement('span');
  statusIcon.className = 'blogpress-performance__status-icon';
  const milestoneReady = (instance.milestone?.percent || 0) >= 1;
  statusIcon.textContent = milestoneReady ? '✨' : '🌱';
  const statusLabel = document.createElement('span');
  statusLabel.className = 'blogpress-performance__status-label';
  statusLabel.textContent = milestoneReady ? 'Milestone ready' : 'Growing steady';
  status.append(statusIcon, statusLabel);
  panel.appendChild(status);

  const detailPanel = document.createElement('article');
  detailPanel.className = 'blogpress-panel blogpress-panel--detail';
  const detailTitle = document.createElement('h3');
  detailTitle.textContent = 'Milestones log';
  detailPanel.appendChild(detailTitle);

  const detailIntro = document.createElement('p');
  detailIntro.className = 'blogpress-panel__note';
  detailIntro.textContent = 'Quality & milestones recap';
  detailPanel.appendChild(detailIntro);

  if (instance.qualityInfo?.description) {
    const description = document.createElement('p');
    description.className = 'blogpress-panel__note';
    description.textContent = instance.qualityInfo.description;
    detailPanel.appendChild(description);
  }

  const stageNumber = Number(instance.qualityLevel) || 1;
  const stageDescriptor = `Stage ${stageNumber}`;
  if (instance.milestone?.nextLevel) {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = `Next milestone: Quality ${instance.milestone.nextLevel.level} — ${instance.milestone.nextLevel.name}. ${instance.milestone.nextLevel.description || ''}`;
    detailPanel.appendChild(milestone);
  } else {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = 'Top tier unlocked — this blog is shining bright!';
    detailPanel.appendChild(milestone);
  }

  if (instance.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'blogpress-panel__hint';
    summary.textContent = instance.milestone.summary;
    detailPanel.appendChild(summary);
  }

  const range = document.createElement('p');
  range.className = 'blogpress-panel__range';
  range.textContent = `Daily range at this tier: ${formatRange(instance.qualityRange)}`;
  detailPanel.appendChild(range);

  const milestonePercent = Math.round((instance.milestone?.percent || 0) * 100);
  const milestoneStatus = milestoneReady
    ? 'Milestone ready'
    : `Next at ${Math.max(milestonePercent, 1)}%`;
  detailPanel.dataset.summaryLabel = `Milestones log — ${stageDescriptor}, ${milestoneStatus}`;

  return { panel, details: detailPanel };
}
