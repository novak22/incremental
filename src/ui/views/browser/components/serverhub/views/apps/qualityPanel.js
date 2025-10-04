export function renderQualityPanel(instance) {
  if (!instance.milestone) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'serverhub-panel';

  const heading = document.createElement('div');
  heading.className = 'serverhub-panel__header';

  const title = document.createElement('h3');
  title.textContent = 'Quality tier';

  const badge = document.createElement('span');
  badge.className = 'serverhub-panel__badge';
  badge.textContent = `Tier ${instance.milestone.level}`;

  heading.append(title, badge);
  section.appendChild(heading);

  const progress = document.createElement('div');
  progress.className = 'serverhub-progress';
  progress.style.setProperty(
    '--serverhub-progress',
    String(Math.round((instance.milestone.percent || 0) * 100))
  );

  const progressFill = document.createElement('span');
  progressFill.className = 'serverhub-progress__fill';
  progress.appendChild(progressFill);

  const summary = document.createElement('p');
  summary.className = 'serverhub-panel__hint';
  summary.textContent = instance.milestone.summary;

  section.append(progress, summary);
  return section;
}

export default renderQualityPanel;
