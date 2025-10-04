import { CATEGORY_DEFINITIONS, VIEW_CATALOG, VIEW_FREE, VIEW_MY_COURSES } from '../constants.js';
import { createProgressBar } from './shared/progressBar.js';

function resolveCategoryLabel(categoryId) {
  return CATEGORY_DEFINITIONS.find(entry => entry.id === categoryId)?.label || null;
}

export default function renderDetailView({ state, context, formatters, handlers, describeSkills }) {
  const course = context.courseMap.get(state.selectedCourseId);
  if (!course) {
    if (typeof handlers.onMissingCourse === 'function') {
      handlers.onMissingCourse();
    }
    return document.createDocumentFragment();
  }

  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--detail';

  const backTab = state.tab || VIEW_CATALOG;
  let backLabel = '← Back to catalog';
  let backView = VIEW_CATALOG;
  switch (backTab) {
    case VIEW_FREE:
      backLabel = '← Back to free courses';
      backView = VIEW_FREE;
      break;
    case VIEW_MY_COURSES:
      backLabel = '← Back to My Courses';
      backView = VIEW_MY_COURSES;
      break;
    default:
      backLabel = '← Back to catalog';
      backView = VIEW_CATALOG;
      break;
  }

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'learnly-back';
  backButton.textContent = backLabel;
  backButton.addEventListener('click', () => {
    if (typeof handlers.onSetView === 'function') {
      handlers.onSetView(backView, { tab: backTab });
    }
  });
  section.appendChild(backButton);

  const header = document.createElement('header');
  header.className = 'learnly-detail__header';

  const badges = document.createElement('div');
  badges.className = 'learnly-card__badges';
  course.categories.forEach(categoryId => {
    const label = resolveCategoryLabel(categoryId);
    if (!label) return;
    const badge = document.createElement('span');
    badge.className = 'learnly-badge';
    badge.textContent = label;
    badges.appendChild(badge);
  });

  const title = document.createElement('h2');
  title.textContent = course.name;

  const summary = document.createElement('p');
  summary.className = 'learnly-detail__summary';
  summary.textContent = course.description || course.summary;

  header.append(badges, title, summary);
  section.appendChild(header);

  section.appendChild(createProgressBar(course));

  const highlights = document.createElement('div');
  highlights.className = 'learnly-detail__highlights';
  [
    { label: 'Tuition', value: course.tuition > 0 ? formatters.formatCurrency(course.tuition) : 'Free' },
    { label: 'Daily study commitment', value: `${formatters.formatHours(course.hoursPerDay)} per day` },
    { label: 'Course length', value: formatters.formatDays(course.days) }
  ].forEach(entry => {
    const item = document.createElement('div');
    item.className = 'learnly-highlight';
    const label = document.createElement('span');
    label.className = 'learnly-highlight__label';
    label.textContent = entry.label;
    const value = document.createElement('strong');
    value.className = 'learnly-highlight__value';
    value.textContent = entry.value;
    item.append(label, value);
    highlights.appendChild(item);
  });
  section.appendChild(highlights);

  const body = document.createElement('div');
  body.className = 'learnly-detail__body';

  const learning = document.createElement('section');
  learning.className = 'learnly-detail__section';
  const learningTitle = document.createElement('h3');
  learningTitle.textContent = "What you'll learn";
  const learningList = document.createElement('ul');
  learningList.className = 'learnly-detail__list';
  if (course.bonuses.length) {
    course.bonuses.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      learningList.appendChild(item);
    });
  } else {
    const item = document.createElement('li');
    item.textContent = 'Progress unlocks bonus payouts for connected hustles.';
    learningList.appendChild(item);
  }
  const skillFocus = document.createElement('li');
  skillFocus.textContent = `Skill focus: ${describeSkills(course.skills)}.`;
  learningList.appendChild(skillFocus);
  learning.append(learningTitle, learningList);

  const requirements = document.createElement('section');
  requirements.className = 'learnly-detail__section';
  const reqTitle = document.createElement('h3');
  reqTitle.textContent = 'Requirements';
  const reqList = document.createElement('ul');
  reqList.className = 'learnly-detail__list';
  [
    `Tuition: ${course.tuition > 0 ? formatters.formatCurrency(course.tuition) : 'No upfront cost.'}`,
    `Daily time: Reserve ${formatters.formatHours(course.hoursPerDay)} each day.`,
    `Length: Graduate in ${formatters.formatDays(course.days)}.`
  ].forEach(entry => {
    const item = document.createElement('li');
    item.textContent = entry;
    reqList.appendChild(item);
  });
  const scheduleNote = document.createElement('li');
  scheduleNote.textContent = 'Learnly automatically books these hours when you enroll so your routine stays on track.';
  reqList.appendChild(scheduleNote);
  requirements.append(reqTitle, reqList);

  const rewards = document.createElement('section');
  rewards.className = 'learnly-detail__section';
  const rewardsTitle = document.createElement('h3');
  rewardsTitle.textContent = 'Certificate of Completion';
  const rewardsBody = document.createElement('p');
  if (course.skillXp > 0) {
    rewardsBody.textContent = `Finish the full ${formatters.formatDays(course.days)} to earn +${course.skillXp} XP across ${describeSkills(course.skills)}.`;
  } else {
    rewardsBody.textContent = 'Graduates unlock new hustle bonuses and long-term multipliers.';
  }
  rewards.append(rewardsTitle, rewardsBody);

  body.append(learning, requirements, rewards);
  section.appendChild(body);

  const cta = document.createElement('div');
  cta.className = 'learnly-detail__cta';
  const primary = document.createElement('button');
  primary.type = 'button';
  primary.className = 'learnly-button learnly-button--primary learnly-button--large';
  if (course.progress.completed) {
    primary.textContent = 'Course complete';
    primary.disabled = true;
  } else if (course.progress.enrolled) {
    primary.textContent = 'Continue learning';
    primary.addEventListener('click', () => {
      if (typeof handlers.onSetView === 'function') {
        handlers.onSetView(VIEW_MY_COURSES, { tab: VIEW_MY_COURSES });
      }
    });
  } else {
    primary.textContent = course.enrollAction?.label || 'Enroll now';
    primary.disabled = Boolean(course.enrollAction?.disabled);
    primary.addEventListener('click', () => {
      if (typeof handlers.onEnrollCourse === 'function') {
        handlers.onEnrollCourse(course);
      }
    });
  }
  cta.appendChild(primary);
  section.appendChild(cta);

  return section;
}
