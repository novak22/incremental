import { CATEGORY_DEFINITIONS } from '../../constants.js';
import { createProgressBar } from './progressBar.js';

function resolveCategoryLabel(categoryId) {
  return CATEGORY_DEFINITIONS.find(entry => entry.id === categoryId)?.label || null;
}

export function createCourseCard({
  course,
  formatters,
  handlers,
  variant,
  unlockNote,
  tuitionLabel,
  sourceTab
}) {
  const { formatCurrency, formatHours, formatDays } = formatters;
  const { onOpenCourse, onEnrollCourse } = handlers;
  const card = document.createElement('article');
  card.className = 'learnly-card';
  card.dataset.courseId = course.id;
  if (variant === 'free') {
    card.classList.add('learnly-card--free');
  }

  const badgeRow = document.createElement('div');
  badgeRow.className = 'learnly-card__badges';
  course.categories.forEach(categoryId => {
    const label = resolveCategoryLabel(categoryId);
    if (!label) return;
    const badge = document.createElement('span');
    badge.className = 'learnly-badge';
    badge.textContent = label;
    badgeRow.appendChild(badge);
  });
  card.appendChild(badgeRow);

  const title = document.createElement('h3');
  title.className = 'learnly-card__title';
  title.textContent = course.name;
  card.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'learnly-card__summary';
  summary.textContent = course.summary;
  card.appendChild(summary);

  if (unlockNote) {
    const unlock = document.createElement('p');
    unlock.className = 'learnly-card__unlock';
    unlock.textContent = unlockNote;
    card.appendChild(unlock);
  }

  const stats = document.createElement('dl');
  stats.className = 'learnly-card__stats';
  [
    { term: 'Tuition', detail: tuitionLabel || (course.tuition > 0 ? formatCurrency(course.tuition) : 'Included') },
    { term: 'Daily time', detail: `${formatHours(course.hoursPerDay)} / day` },
    { term: 'Course length', detail: formatDays(course.days) }
  ].forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.term;
    const dd = document.createElement('dd');
    dd.textContent = entry.detail;
    stats.append(dt, dd);
  });
  card.appendChild(stats);

  if (course.progress.enrolled || course.progress.completed) {
    card.appendChild(createProgressBar(course));
  }

  const actions = document.createElement('div');
  actions.className = 'learnly-card__actions';

  const primaryButton = document.createElement('button');
  primaryButton.type = 'button';
  primaryButton.className = 'learnly-button learnly-button--primary';

  if (course.progress.enrolled && !course.progress.completed) {
    primaryButton.textContent = 'Continue';
    primaryButton.addEventListener('click', event => {
      event.stopPropagation();
      if (typeof onOpenCourse === 'function') {
        onOpenCourse(course.id, sourceTab);
      }
    });
  } else {
    primaryButton.textContent = course.enrollAction?.label || 'Enroll';
    primaryButton.disabled = Boolean(course.enrollAction?.disabled) || course.progress.completed;
    primaryButton.addEventListener('click', event => {
      event.stopPropagation();
      if (typeof onEnrollCourse === 'function') {
        onEnrollCourse(course);
      }
    });
  }

  actions.appendChild(primaryButton);
  card.appendChild(actions);

  card.addEventListener('click', () => {
    if (typeof onOpenCourse === 'function') {
      onOpenCourse(course.id, sourceTab);
    }
  });

  return card;
}

export default createCourseCard;
