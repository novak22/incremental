import { VIEW_CATALOG, VIEW_DETAIL, VIEW_FREE, VIEW_MY_COURSES, VIEW_PRICING } from './constants.js';
import { createEmptyContext } from './context.js';

export const INITIAL_STATE = {
  view: VIEW_CATALOG,
  tab: VIEW_CATALOG,
  category: 'all',
  selectedCourseId: null
};

export function ensureSelectedCourse(state, context = createEmptyContext()) {
  if (!context.courseMap.size) {
    state.selectedCourseId = null;
    return;
  }
  if (!state.selectedCourseId || !context.courseMap.has(state.selectedCourseId)) {
    const activeCourse = context.courses.find(course => course.progress.enrolled && !course.progress.completed);
    const preferredList = state.tab === VIEW_FREE
      ? context.freeCourses
      : context.catalogCourses;
    const preferred = preferredList.find(course => !course.progress.completed) || preferredList[0];
    const fallback = preferred || context.courses[0];
    state.selectedCourseId = (activeCourse || fallback)?.id || null;
  }
}

export function deriveSummaryFromContext(context = createEmptyContext()) {
  const active = context.summary.active;
  const meta = active > 0 ? `${active} active course${active === 1 ? '' : 's'}` : 'Browse the catalog';
  return { meta };
}

export function deriveWorkspacePath(state = {}) {
  const activeTab = state.tab || VIEW_CATALOG;

  if (state.view === VIEW_PRICING) {
    return 'pricing';
  }
  if (state.view === VIEW_MY_COURSES) {
    return 'my-courses';
  }
  if (state.view === VIEW_FREE) {
    return 'free-courses';
  }
  if (state.view === VIEW_DETAIL) {
    const courseId = state.selectedCourseId;
    if (activeTab === VIEW_FREE) {
      return courseId ? `free-courses/${courseId}` : 'free-courses';
    }
    if (activeTab === VIEW_MY_COURSES) {
      return courseId ? `my-courses/${courseId}` : 'my-courses';
    }
    return courseId ? `catalog/${courseId}` : 'catalog';
  }
  if (activeTab === VIEW_FREE) {
    return 'free-courses';
  }
  if (activeTab === VIEW_MY_COURSES) {
    return 'my-courses';
  }
  return 'catalog';
}

export default {
  INITIAL_STATE,
  ensureSelectedCourse,
  deriveSummaryFromContext,
  deriveWorkspacePath
};
