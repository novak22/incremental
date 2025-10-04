import { createCourseCard } from './shared/courseCard.js';
import { VIEW_FREE } from '../constants.js';

export default function renderFreeCoursesView({ context, formatters, handlers, lookupCourseLock }) {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--free';

  const intro = document.createElement('div');
  intro.className = 'learnly-free-intro';
  const heading = document.createElement('h2');
  heading.textContent = 'Free courses';
  const note = document.createElement('p');
  note.textContent = 'Level cornerstone skills without tuition and unlock new workspaces as soon as you graduate.';
  intro.append(heading, note);
  section.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'learnly-grid';

  const courses = context.freeCourses
    .slice()
    .sort((a, b) => Number(a.progress.completed) - Number(b.progress.completed));

  if (!courses.length) {
    const empty = document.createElement('div');
    empty.className = 'learnly-empty';
    const message = document.createElement('p');
    message.textContent = 'No free tracks available right now. Check back after the next update!';
    empty.appendChild(message);
    grid.appendChild(empty);
  } else {
    courses.forEach(course => {
      const lockInfo = lookupCourseLock ? lookupCourseLock(course.id) : null;
      let unlockLabel = 'Earn skill XP to unlock more workspaces.';
      if (lockInfo) {
        unlockLabel = course.progress.completed
          ? `${lockInfo.workspaceLabel} unlocked — enjoy the new workspace!`
          : `Unlocks ${lockInfo.workspaceLabel} • Needs ${lockInfo.skillName} Lv ${lockInfo.requiredLevel}`;
      }
      grid.appendChild(
        createCourseCard({
          course,
          formatters,
          handlers,
          variant: 'free',
          unlockNote: unlockLabel,
          tuitionLabel: 'Free',
          sourceTab: VIEW_FREE
        })
      );
    });
  }

  section.appendChild(grid);
  return section;
}
