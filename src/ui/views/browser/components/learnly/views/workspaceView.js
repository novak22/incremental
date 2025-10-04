import renderTabNavigation from './tabNavigation.js';
import renderCatalogView from './catalogView.js';
import renderDetailView from './detailView.js';
import renderMyCoursesView from './myCoursesView.js';
import renderFreeCoursesView from './freeCoursesView.js';
import renderPricingView from './pricingView.js';
import { VIEW_CATALOG, VIEW_DETAIL, VIEW_FREE, VIEW_MY_COURSES, VIEW_PRICING } from '../constants.js';

function createMetric(label, value, note) {
  const metric = document.createElement('div');
  metric.className = 'learnly-metric';

  const title = document.createElement('span');
  title.className = 'learnly-metric__label';
  title.textContent = label;

  const display = document.createElement('strong');
  display.className = 'learnly-metric__value';
  display.textContent = value;

  metric.append(title, display);

  if (note) {
    const detail = document.createElement('span');
    detail.className = 'learnly-metric__note';
    detail.textContent = note;
    metric.appendChild(detail);
  }

  return metric;
}

function renderHero(context, { formatHours }) {
  const hero = document.createElement('section');
  hero.className = 'learnly__hero';

  const title = document.createElement('div');
  title.className = 'learnly__title';
  const heading = document.createElement('h1');
  heading.textContent = 'Learnly Academy';
  const note = document.createElement('p');
  note.textContent = 'Browse career-grade courses, reserve your study hours, and unlock hustle bonuses.';
  title.append(heading, note);

  const metrics = document.createElement('div');
  metrics.className = 'learnly-metrics';
  metrics.append(
    createMetric('Active enrollments', `${context.summary.active}`, context.summary.active === 1 ? 'Course in progress' : 'Courses in progress'),
    createMetric('Daily hours reserved', formatHours(context.summary.dailyHours), 'Held automatically each morning'),
    createMetric('Total catalog', `${context.summary.total}`, 'Tracks ready to enroll')
  );

  hero.append(title, metrics);
  return hero;
}

export function renderLearnlyHeader({ state, context, handlers, formatters }) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderHero(context, { formatHours: formatters.formatHours }));

  const freeBadge = context.freeCourses
    .filter(course => !course.progress.completed)
    .length || null;

  fragment.appendChild(
    renderTabNavigation({
      activeTab: state.tab,
      badges: {
        free: freeBadge,
        myCourses: context.summary.active || null
      },
      handlers: { onOpenTab: handlers.onOpenTab }
    })
  );

  return fragment;
}

export function renderLearnlyView({ state, context, handlers, formatters, describeSkills }) {
  switch (state.view) {
    case VIEW_DETAIL:
      return renderDetailView({
        state,
        context,
        formatters,
        handlers: {
          onSetView: handlers.onSetView,
          onEnrollCourse: handlers.onEnrollCourse,
          onMissingCourse: handlers.onMissingCourse
        },
        describeSkills
      });
    case VIEW_MY_COURSES:
      return renderMyCoursesView({
        context,
        formatters,
        handlers: {
          onOpenCourse: handlers.onOpenCourse,
          onDropCourse: handlers.onDropCourse
        }
      });
    case VIEW_FREE:
      return renderFreeCoursesView({
        context,
        formatters,
        handlers: {
          onOpenCourse: handlers.onOpenCourse,
          onEnrollCourse: handlers.onEnrollCourse
        },
        lookupCourseLock: handlers.lookupCourseLock
      });
    case VIEW_PRICING:
      return renderPricingView({ context, formatters });
    case VIEW_CATALOG:
    default:
      return renderCatalogView({
        state,
        context,
        formatters,
        handlers: {
          onSelectCategory: handlers.onSelectCategory,
          onOpenCourse: handlers.onOpenCourse,
          onEnrollCourse: handlers.onEnrollCourse
        }
      });
  }
}

export default {
  renderLearnlyHeader,
  renderLearnlyView
};
