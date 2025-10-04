export default function renderQualityPanel(video, { formatHours } = {}) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';

  const title = document.createElement('h3');
  title.textContent = 'Quality momentum';
  panel.appendChild(title);

  const level = document.createElement('p');
  level.className = 'videotube-panel__lead';
  level.textContent = `Quality ${video.qualityLevel} • ${video.qualityInfo?.name || 'Growing audience'}`;
  panel.appendChild(level);

  const progress = document.createElement('div');
  progress.className = 'videotube-progress';

  const progressFill = document.createElement('div');
  progressFill.className = 'videotube-progress__fill';
  progressFill.style.setProperty('--videotube-progress', String((video.milestone?.percent || 0) * 100));
  progress.appendChild(progressFill);
  panel.appendChild(progress);

  if (video.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.milestone.summary} • next: ${video.milestone?.nextLevel?.name || 'Maxed out'}`;
    panel.appendChild(summary);
  }

  if (video.milestone?.steps?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-list';
    video.milestone.steps.forEach(step => {
      const item = document.createElement('li');
      item.textContent = `${step.current}/${step.goal} ${step.label}`;
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  return panel;
}
