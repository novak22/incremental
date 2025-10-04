import { describeTrackEducationBonuses } from '../../../../../game/educationEffects.js';
import { CATEGORY_DEFINITIONS } from './constants.js';

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

export function createEmptyContext() {
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

export function describeSkills(skills = []) {
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

export function buildContext(model = {}, definitions = []) {
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

