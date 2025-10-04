import { createEnrollmentCard } from './shared/enrollmentCard.js';
import { VIEW_MY_COURSES } from '../constants.js';

export default function renderMyCoursesView({ context, formatters, handlers }) {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--my-courses';

  const intro = document.createElement('div');
  intro.className = 'learnly-my-courses__intro';
  const heading = document.createElement('h2');
  heading.textContent = 'My Courses';
  const note = document.createElement('p');
  note.textContent = `Daily study time reserved: ${formatters.formatHours(context.summary.dailyHours)} • Tuition invested: ${formatters.formatCurrency(context.summary.tuitionInvested)}`;
  intro.append(heading, note);
  section.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'learnly-enrollment-list';

  const enrolledCourses = context.courses
    .map((course, index) => ({ course, index }))
    .filter(entry => entry.course.progress.enrolled || entry.course.progress.completed)
    .sort((a, b) => {
      const aActive = a.course.progress.enrolled && !a.course.progress.completed;
      const bActive = b.course.progress.enrolled && !b.course.progress.completed;
      if (aActive === bActive) {
        return a.index - b.index;
      }
      return aActive ? -1 : 1;
    })
    .map(entry => entry.course);

  if (!enrolledCourses.length) {
    const empty = document.createElement('div');
    empty.className = 'learnly-empty';
    const message = document.createElement('p');
    message.textContent = 'You have no courses in progress. Browse the catalog to start a new track.';
    empty.appendChild(message);
    section.appendChild(empty);
    return section;
  }

  enrolledCourses.forEach(course => {
    list.appendChild(
      createEnrollmentCard({
        course,
        formatters,
        handlers,
        sourceTab: VIEW_MY_COURSES
      })
    );
  });

  section.appendChild(list);
  return section;
}
