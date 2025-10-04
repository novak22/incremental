import { createProgressBar } from './progressBar.js';

function createEnrollmentCard({ course, formatters, handlers, sourceTab }) {
  const { formatCurrency, formatHours, formatDays } = formatters;
  const { onOpenCourse, onDropCourse } = handlers;

  const card = document.createElement('article');
  card.className = 'learnly-enrollment';

  const header = document.createElement('header');
  header.className = 'learnly-enrollment__header';
  const title = document.createElement('h3');
  title.textContent = course.name;
  header.appendChild(title);

  const status = document.createElement('span');
  status.className = 'learnly-enrollment__status';
  status.textContent = course.progress.completed
    ? 'Completed'
    : course.progress.enrolled && course.progress.studiedToday
      ? 'Today logged'
      : 'Study pending';
  header.appendChild(status);
  card.appendChild(header);

  card.appendChild(createProgressBar(course));

  const details = document.createElement('dl');
  details.className = 'learnly-enrollment__stats';
  [
    { term: 'Daily hours', detail: formatHours(course.hoursPerDay) },
    { term: 'Course length', detail: formatDays(course.days) },
    { term: 'Tuition paid', detail: course.tuition > 0 ? formatCurrency(course.tuition) : 'Included' }
  ].forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.term;
    const dd = document.createElement('dd');
    dd.textContent = entry.detail;
    details.append(dt, dd);
  });
  card.appendChild(details);

  const actions = document.createElement('div');
  actions.className = 'learnly-enrollment__actions';

  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'learnly-button learnly-button--primary';
  continueButton.textContent = course.progress.completed ? 'Review course' : 'Continue';
  continueButton.addEventListener('click', () => {
    if (typeof onOpenCourse === 'function') {
      onOpenCourse(course.id, sourceTab);
    }
  });
  actions.appendChild(continueButton);

  if (course.progress.enrolled && !course.progress.completed) {
    const dropButton = document.createElement('button');
    dropButton.type = 'button';
    dropButton.className = 'learnly-button learnly-button--ghost';
    dropButton.textContent = 'Drop course';
    dropButton.addEventListener('click', () => {
      if (typeof onDropCourse === 'function') {
        onDropCourse(course);
      }
    });
    actions.appendChild(dropButton);
  }

  card.appendChild(actions);
  return card;
}

export { createEnrollmentCard };

const createEnrollmentCardComponent = createEnrollmentCard;
export default createEnrollmentCardComponent;
