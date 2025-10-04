export function createProgressBar(course) {
  const wrapper = document.createElement('div');
  wrapper.className = 'learnly-progress';

  const label = document.createElement('span');
  label.className = 'learnly-progress__label';
  if (course.progress.completed) {
    label.textContent = 'Completed';
  } else if (course.progress.enrolled) {
    const remaining = Math.max(0, course.progress.totalDays - course.progress.daysCompleted);
    label.textContent = `${course.progress.daysCompleted}/${course.progress.totalDays} days • ${remaining} left`;
  } else {
    label.textContent = 'Not enrolled yet';
  }

  const bar = document.createElement('div');
  bar.className = 'learnly-progress__bar';
  const fill = document.createElement('span');
  fill.style.width = `${Math.min(100, Math.max(0, course.progress.percent))}%`;
  bar.appendChild(fill);

  wrapper.append(label, bar);
  return wrapper;
}

