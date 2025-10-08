export default function renderQualityPanel({ instance, formatRange }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--quality';

  const title = document.createElement('h3');
  title.textContent = 'Quality & milestones';
  panel.appendChild(title);

  const stage = document.createElement('div');
  stage.className = 'blogpress-quality-stage';
  const stageLabel = document.createElement('span');
  stageLabel.className = 'blogpress-quality-stage__label';
  stageLabel.textContent = instance.qualityInfo?.name || 'Skeleton Drafts';
  const stageMeta = document.createElement('span');
  stageMeta.className = 'blogpress-quality-stage__meta';
  stageMeta.textContent = `Stage ${instance.qualityLevel}`;
  stage.append(stageLabel, stageMeta);
  panel.appendChild(stage);

  if (instance.qualityInfo?.description) {
    const description = document.createElement('p');
    description.className = 'blogpress-panel__note';
    description.textContent = instance.qualityInfo.description;
    panel.appendChild(description);
  }

  const progress = document.createElement('div');
  progress.className = 'blogpress-progress';
  const fill = document.createElement('div');
  fill.className = 'blogpress-progress__fill';
  fill.style.width = `${Math.round((instance.milestone.percent || 0) * 100)}%`;
  progress.appendChild(fill);
  panel.appendChild(progress);

  const progressIcon = document.createElement('span');
  progressIcon.className = 'blogpress-progress__icon';
  progressIcon.textContent = instance.milestone?.percent >= 1 ? '✨ Milestone ready' : '🌱 Growing';
  panel.appendChild(progressIcon);

  if (instance.milestone.nextLevel) {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = `Next milestone: Quality ${instance.milestone.nextLevel.level} — ${instance.milestone.nextLevel.name}. ${instance.milestone.nextLevel.description || ''}`;
    panel.appendChild(milestone);
  } else {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = 'Top tier unlocked — this blog is shining bright!';
    panel.appendChild(milestone);
  }

  const summary = document.createElement('p');
  summary.className = 'blogpress-panel__hint';
  summary.textContent = instance.milestone.summary;
  panel.appendChild(summary);

  const range = document.createElement('p');
  range.className = 'blogpress-panel__range';
  range.textContent = `Daily range at this tier: ${formatRange(instance.qualityRange)}`;
  panel.appendChild(range);

  return panel;
}
