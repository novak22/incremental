import { formatDays, formatHours } from '../../../../../core/helpers.js';
import { describeTrackEducationBonuses } from '../../../../../game/educationEffects.js';
import { dropKnowledgeTrack } from '../../../../../game/requirements.js';
import { formatCurrency as baseFormatCurrency } from '../utils/formatting.js';
import { createTabbedWorkspacePresenter } from '../utils/createTabbedWorkspacePresenter.js';
import { getWorkspaceLockByCourse } from '../cards/model/skillLocks.js';
import {
  CATEGORY_DEFINITIONS,
  VIEW_CATALOG,
  VIEW_DETAIL,
  VIEW_FREE,
  VIEW_MY_COURSES,
  VIEW_PRICING
} from './constants.js';
import renderTabNavigation from './views/tabNavigation.js';
import renderCatalogView from './views/catalogView.js';
import renderDetailView from './views/detailView.js';
import renderMyCoursesView from './views/myCoursesView.js';
import renderFreeCoursesView from './views/freeCoursesView.js';
import renderPricingView from './views/pricingView.js';

const INITIAL_STATE = {
  view: VIEW_CATALOG,
  tab: VIEW_CATALOG,
  category: 'all',
  selectedCourseId: null
};

const CATEGORY_BY_SKILL = CATEGORY_DEFINITIONS.reduce((map, category) => {
  category.skills.forEach(skillId => {
    if (!skillId) return;
    if (!map.has(skillId)) {
      map.set(skillId, new Set());
    }
    map.get(skillId).add(category.id);
  });
  return map;
}, new Map());

const formatCurrency = amount => baseFormatCurrency(amount, { clampZero: true });

function createEmptyContext() {
  return {
    courses: [],
    catalogCourses: [],
    freeCourses: [],
    courseMap: new Map(),
    categories: [],
    summary: {
      total: 0,
      active: 0,
      completed: 0,
      dailyHours: 0,
      tuitionInvested: 0
    }
  };
}

function deriveCategories(skills = []) {
  const categoryIds = new Set();
  skills.forEach(entry => {
    const ids = CATEGORY_BY_SKILL.get(entry.id);
    if (!ids) return;
    ids.forEach(id => categoryIds.add(id));
  });
  if (!categoryIds.size) {
    categoryIds.add('general');
  }
  return Array.from(categoryIds);
}

function describeSkills(skills = []) {
  if (!skills.length) return 'Broaden your creator toolkit.';
  return skills
    .map(skill => {
      const weight = Math.round((Number(skill.weight) || 0) * 100);
      return weight > 0 ? `${skill.name} (${weight}%)` : skill.name;
    })
    .join(' • ');
}

function buildCourse(track, definitionMap) {
  const definition = definitionMap.get(track.definitionId) || definitionMap.get(track.id) || null;
  const action = definition?.action || null;
  const bonuses = describeTrackEducationBonuses(track.id)
    .map(entry => (typeof entry === 'function' ? entry() : entry))
    .filter(Boolean);

  const totalDays = Number(track.progress?.totalDays) || Number(track.days) || 0;
  const completedDays = track.progress?.completed
    ? totalDays
    : Math.min(totalDays, Number(track.progress?.daysCompleted) || 0);
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const enrollLabel = action
    ? typeof action.label === 'function'
      ? action.label()
      : action.label || track.action?.label
    : track.action?.label;
  const enrollDisabled = action
    ? typeof action.disabled === 'function'
      ? action.disabled()
      : Boolean(action.disabled)
    : Boolean(track.action?.disabled);

  return {
    id: track.id,
    definitionId: track.definitionId,
    name: track.name,
    summary: track.summary || track.description || '',
    description: track.description || track.summary || '',
    tuition: Number(track.tuition) || 0,
    hoursPerDay: Number(track.hoursPerDay) || 0,
    days: Number(track.days) || 0,
    skillXp: Number(track.skillXp) || 0,
    skills: track.skills || [],
    categories: deriveCategories(track.skills || []),
    progress: {
      enrolled: Boolean(track.progress?.enrolled),
      completed: Boolean(track.progress?.completed),
      studiedToday: Boolean(track.progress?.studiedToday),
      daysCompleted: completedDays,
      totalDays,
      percent
    },
    bonuses,
    enrollAction: action
      ? {
          label: enrollLabel || 'Enroll Now',
          disabled: enrollDisabled,
          onClick: action.onClick || null
        }
      : track.action
        ? {
            label: track.action.label || 'Enroll Now',
            disabled: Boolean(track.action.disabled),
            onClick: null
          }
        : null
  };
}

function buildContext(model = {}, definitions = []) {
  if (!model) {
    return createEmptyContext();
  }

  const definitionMap = new Map((definitions || []).map(definition => [definition?.id, definition]).filter(Boolean));
  const tracks = Array.isArray(model?.tracks) ? model.tracks : [];
  const courses = tracks.map(track => buildCourse(track, definitionMap));
  const freeCourses = courses.filter(course => course.tuition <= 0);
  const paidCourses = courses.filter(course => course.tuition > 0);
  const catalogCourses = paidCourses.filter(course => !course.progress.completed);
  const courseMap = new Map(courses.map(course => [course.id, course]));

  const summary = courses.reduce(
    (acc, course) => {
      if (!course.progress.completed) {
        acc.total += 1;
      }
      if (course.progress.enrolled && !course.progress.completed) {
        acc.active += 1;
        acc.dailyHours += course.hoursPerDay;
        acc.tuitionInvested += course.tuition;
      }
      if (course.progress.completed) {
        acc.completed += 1;
      }
      return acc;
    },
    { total: 0, active: 0, completed: 0, dailyHours: 0, tuitionInvested: 0 }
  );

  const categoryCounts = new Map();
  catalogCourses.forEach(course => {
    course.categories.forEach(categoryId => {
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    });
  });

  const categories = [
    { id: 'all', label: 'All Courses', count: catalogCourses.length }
  ];

  CATEGORY_DEFINITIONS.forEach(category => {
    if (category.id === 'general') {
      if (categoryCounts.has('general')) {
        categories.push({ id: category.id, label: category.label, count: categoryCounts.get('general') });
      }
      return;
    }
    const count = categoryCounts.get(category.id);
    if (count) {
      categories.push({ id: category.id, label: category.label, count });
    }
  });

  return { courses, catalogCourses, freeCourses, courseMap, categories, summary };
}

function ensureSelectedCourse(state, context = createEmptyContext()) {
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

function deriveSummaryFromContext(context = createEmptyContext()) {
  const active = context.summary.active;
  const meta = active > 0 ? `${active} active course${active === 1 ? '' : 's'}` : 'Browse the catalog';
  return { meta };
}

function deriveWorkspacePath(state = {}) {
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

function renderHero(context = createEmptyContext()) {
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

function renderHeaderSection({ state, context, handlers }) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderHero(context));

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

function renderViewsForState({ state, context, handlers, formatters }) {
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

export function createLearnlyWorkspace() {
  let currentDefinitions = [];
  let currentContext = createEmptyContext();

  const presenterHandlers = {
    lookupCourseLock: getWorkspaceLockByCourse
  };

  const presenter = createTabbedWorkspacePresenter({
    className: 'learnly',
    state: { ...INITIAL_STATE },
    beforeRender(renderContext) {
      currentContext = buildContext(renderContext.model, currentDefinitions);
      renderContext.learnly = currentContext;
    },
    ensureSelection(state) {
      ensureSelectedCourse(state, currentContext);
    },
    deriveSummary() {
      return deriveSummaryFromContext(currentContext);
    },
    derivePath: deriveWorkspacePath,
    renderHeader(model, state) {
      return renderHeaderSection({
        state,
        context: currentContext,
        handlers: presenterHandlers
      });
    },
    renderViews(model, state) {
      return renderViewsForState({
        state,
        context: currentContext,
        handlers: presenterHandlers,
        formatters: {
          formatCurrency,
          formatHours,
          formatDays
        }
      });
    }
  });

  function rerender(options = {}) {
    presenter.render(presenter.getModel(), options);
  }

  presenterHandlers.onOpenTab = tabId => {
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

  presenterHandlers.onSelectCategory = categoryId => {
    const id = categoryId || 'all';
    presenter.updateState(current => ({
      ...current,
      category: id,
      tab: VIEW_CATALOG,
      view: VIEW_CATALOG
    }));
    rerender();
  };

  presenterHandlers.onOpenCourse = (courseId, sourceTab) => {
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

  presenterHandlers.onSetView = (view, options = {}) => {
    presenter.updateState(current => ({
      ...current,
      ...options,
      view,
      tab: options.tab != null ? options.tab : current.tab
    }));
    rerender();
  };

  presenterHandlers.onMissingCourse = () => {
    presenterHandlers.onSetView(VIEW_CATALOG, { tab: VIEW_CATALOG });
  };

  presenterHandlers.onEnrollCourse = course => {
    if (!course) return;
    if (course.enrollAction?.disabled) return;
    if (typeof course.enrollAction?.onClick === 'function') {
      course.enrollAction.onClick();
    }
  };

  presenterHandlers.onDropCourse = course => {
    if (!course || !course.progress.enrolled) return;
    const message = `Drop ${course.name}? Tuition is non-refundable, but you will free up ${formatHours(course.hoursPerDay)} per day.`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
    if (!confirmed) return;
    const result = dropKnowledgeTrack(course.id);
    if (result?.success) {
      rerender({ force: true, forcePathSync: true });
    }
  };

  return {
    render(model = {}, context = {}) {
      currentDefinitions = Array.isArray(context.definitions) ? context.definitions : [];
      return presenter.render(model, context);
    }
  };
}

export default {
  createLearnlyWorkspace
};
