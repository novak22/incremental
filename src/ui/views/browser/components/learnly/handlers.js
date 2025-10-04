import { dropKnowledgeTrack } from '../../../../../game/requirements.js';
import { formatHours } from '../../../../../core/helpers.js';
import { VIEW_CATALOG, VIEW_DETAIL, VIEW_FREE, VIEW_MY_COURSES, VIEW_PRICING } from './constants.js';
import { getWorkspaceLockByCourse } from '../../../../cards/model/skillLocks.js';

export function createLearnlyHandlers({ presenter, rerender }) {
  const handlers = {
    lookupCourseLock: getWorkspaceLockByCourse
  };

  handlers.onOpenTab = tabId => {
    presenter.updateState(current => {
      const next = { ...current };
      switch (tabId) {
        case VIEW_MY_COURSES:
          next.tab = VIEW_MY_COURSES;
          next.view = VIEW_MY_COURSES;
          break;
        case VIEW_FREE:
          next.tab = VIEW_FREE;
          next.view = VIEW_FREE;
          break;
        case VIEW_PRICING:
          next.tab = VIEW_PRICING;
          next.view = VIEW_PRICING;
          break;
        default:
          next.tab = VIEW_CATALOG;
          next.view = VIEW_CATALOG;
          break;
      }
      return next;
    });
    rerender();
  };

  handlers.onSelectCategory = categoryId => {
    const id = categoryId || 'all';
    presenter.updateState(current => ({
      ...current,
      category: id,
      tab: VIEW_CATALOG,
      view: VIEW_CATALOG
    }));
    rerender();
  };

  handlers.onOpenCourse = (courseId, sourceTab) => {
    if (!courseId) return;
    presenter.updateState(current => {
      const nextTab = sourceTab || current.tab || VIEW_CATALOG;
      return {
        ...current,
        selectedCourseId: courseId,
        tab: nextTab,
        view: VIEW_DETAIL
      };
    });
    rerender();
  };

  handlers.onSetView = (view, options = {}) => {
    presenter.updateState(current => ({
      ...current,
      ...options,
      view,
      tab: options.tab != null ? options.tab : current.tab
    }));
    rerender();
  };

  handlers.onMissingCourse = () => {
    handlers.onSetView(VIEW_CATALOG, { tab: VIEW_CATALOG });
  };

  handlers.onEnrollCourse = course => {
    if (!course) return;
    if (course.enrollAction?.disabled) return;
    if (typeof course.enrollAction?.onClick === 'function') {
      course.enrollAction.onClick();
    }
  };

  handlers.onDropCourse = course => {
    if (!course || !course.progress.enrolled) return;
    const message = `Drop ${course.name}? Tuition is non-refundable, but you will free up ${formatHours(course.hoursPerDay)} per day.`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
    if (!confirmed) return;
    const result = dropKnowledgeTrack(course.id);
    if (result?.success) {
      rerender({ force: true, forcePathSync: true });
    }
  };

  return handlers;
}

export default {
  createLearnlyHandlers
};
