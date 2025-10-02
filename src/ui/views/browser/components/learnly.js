import { formatDays, formatHours } from '../../../../core/helpers.js';
import { describeTrackEducationBonuses } from '../../../../game/educationEffects.js';
import { dropKnowledgeTrack } from '../../../../game/requirements.js';
import { formatCurrency as baseFormatCurrency } from '../utils/formatting.js';
import { createWorkspacePathController } from '../utils/workspacePaths.js';

const VIEW_CATALOG = 'catalog';
const VIEW_DETAIL = 'detail';
const VIEW_MY_COURSES = 'myCourses';
const VIEW_PRICING = 'pricing';

const CATEGORY_DEFINITIONS = [
  { id: 'writing', label: 'Writing & Storycraft', skills: ['writing'] },
  { id: 'audience', label: 'Audience Engagement', skills: ['audience'] },
  { id: 'promotion', label: 'Promotion & Funnels', skills: ['promotion'] },
  { id: 'research', label: 'Market Research', skills: ['research'] },
  { id: 'visualEditing', label: 'Visual & Editing Skills', skills: ['visual', 'editing'] },
  { id: 'commerce', label: 'Commerce & Fulfillment', skills: ['commerce'] },
  { id: 'technical', label: 'Technical Skills (Software, Infra)', skills: ['software', 'infrastructure'] },
  { id: 'audio', label: 'Audio / Media Skills', skills: ['audio'] },
  { id: 'general', label: 'Multidisciplinary', skills: [] }
];

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

let currentMount = null;

let currentState = {
  view: VIEW_CATALOG,
  tab: VIEW_CATALOG,
  category: 'all',
  selectedCourseId: null
};

let currentContext = {
  courses: [],
  catalogCourses: [],
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

const workspacePathController = createWorkspacePathController({
  derivePath: deriveWorkspacePath
});

const formatCurrency = amount =>
  baseFormatCurrency(amount, { clampZero: true });

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
  const definitionMap = new Map((definitions || []).map(definition => [definition?.id, definition]).filter(Boolean));
  const tracks = Array.isArray(model?.tracks) ? model.tracks : [];
  const courses = tracks.map(track => buildCourse(track, definitionMap));
  const catalogCourses = courses.filter(course => !course.progress.completed);
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

  return { courses, catalogCourses, courseMap, categories, summary };
}

function ensureSelectedCourse() {
  if (!currentContext.courseMap.size) {
    currentState.selectedCourseId = null;
    return;
  }
  if (!currentState.selectedCourseId || !currentContext.courseMap.has(currentState.selectedCourseId)) {
    const activeCourse = currentContext.courses.find(course => course.progress.enrolled && !course.progress.completed);
    const fallback = currentContext.catalogCourses[0] || currentContext.courses[0];
    currentState.selectedCourseId = (activeCourse || fallback)?.id || null;
  }
}

function setState(partial) {
  currentState = { ...currentState, ...partial };
  if (currentState.view === VIEW_DETAIL) {
    ensureSelectedCourse();
  }
  draw();
  workspacePathController.sync();
}

function handleSelectCategory(categoryId) {
  setState({ category: categoryId || 'all', view: VIEW_CATALOG, tab: VIEW_CATALOG });
}

function handleOpenCourse(courseId) {
  if (!courseId) return;
  setState({ selectedCourseId: courseId, view: VIEW_DETAIL, tab: VIEW_CATALOG });
}

function handleOpenTab(tab) {
  if (tab === VIEW_MY_COURSES) {
    setState({ tab, view: VIEW_MY_COURSES });
    return;
  }
  if (tab === VIEW_PRICING) {
    setState({ tab, view: VIEW_PRICING });
    return;
  }
  setState({ tab: VIEW_CATALOG, view: VIEW_CATALOG });
}

function handleEnroll(course) {
  if (!course) return;
  if (course.enrollAction?.disabled) return;
  if (typeof course.enrollAction?.onClick === 'function') {
    course.enrollAction.onClick();
  }
}

function handleDrop(course) {
  if (!course || !course.progress.enrolled) return;
  const message = `Drop ${course.name}? Tuition is non-refundable, but you will free up ${formatHours(course.hoursPerDay)} per day.`;
  const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
  if (!confirmed) return;
  const result = dropKnowledgeTrack(course.id);
  if (result?.success) {
    course.progress.enrolled = false;
    draw();
    workspacePathController.sync();
  }
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

function renderHero() {
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
    createMetric('Active enrollments', `${currentContext.summary.active}`, currentContext.summary.active === 1 ? 'Course in progress' : 'Courses in progress'),
    createMetric('Daily hours reserved', formatHours(currentContext.summary.dailyHours), 'Held automatically each morning'),
    createMetric('Total catalog', `${currentContext.summary.total}`, 'Tracks ready to enroll')
  );

  hero.append(title, metrics);
  return hero;
}

function renderTabs() {
  const nav = document.createElement('nav');
  nav.className = 'learnly-tabs';

  const tabs = [
    { id: VIEW_CATALOG, label: 'Catalog' },
    { id: VIEW_MY_COURSES, label: 'My Courses', badge: currentContext.summary.active || null },
    { id: VIEW_PRICING, label: 'Pricing Info' }
  ];

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learnly-tab';
    if (currentState.tab === tab.id || (currentState.view === VIEW_DETAIL && tab.id === VIEW_CATALOG)) {
      button.classList.add('is-active');
    }
    button.textContent = tab.label;
    if (tab.badge) {
      const badge = document.createElement('span');
      badge.className = 'learnly-tab__badge';
      badge.textContent = tab.badge;
      button.appendChild(badge);
    }
    button.addEventListener('click', () => handleOpenTab(tab.id));
    nav.appendChild(button);
  });

  return nav;
}

function createCategoryButton(category) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'learnly-filter__button';
  if (currentState.category === category.id) {
    button.classList.add('is-active');
  }
  button.textContent = category.count ? `${category.label} (${category.count})` : category.label;
  button.addEventListener('click', () => handleSelectCategory(category.id));
  return button;
}

function renderCatalogView() {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--catalog';

  const filter = document.createElement('div');
  filter.className = 'learnly-filter';
  currentContext.categories.forEach(category => {
    filter.appendChild(createCategoryButton(category));
  });

  const catalog = document.createElement('div');
  catalog.className = 'learnly-grid';

  const filteredCourses = currentContext.catalogCourses.filter(course => {
    if (currentState.category === 'all') return true;
    return course.categories.includes(currentState.category);
  });

  if (!filteredCourses.length) {
    const empty = document.createElement('div');
    empty.className = 'learnly-empty';
    const message = document.createElement('p');
    message.textContent = 'No courses in this category yet. Check back after unlocking new programs!';
    empty.appendChild(message);
    catalog.appendChild(empty);
  } else {
    filteredCourses.forEach(course => {
      catalog.appendChild(createCourseCard(course));
    });
  }

  section.append(filter, catalog);
  return section;
}

function createCourseCard(course) {
  const card = document.createElement('article');
  card.className = 'learnly-card';
  card.dataset.courseId = course.id;

  const badgeRow = document.createElement('div');
  badgeRow.className = 'learnly-card__badges';
  course.categories.forEach(categoryId => {
    const category = CATEGORY_DEFINITIONS.find(entry => entry.id === categoryId);
    if (!category) return;
    const badge = document.createElement('span');
    badge.className = 'learnly-badge';
    badge.textContent = category.label;
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

  const stats = document.createElement('dl');
  stats.className = 'learnly-card__stats';
  [
    { term: 'Tuition', detail: course.tuition > 0 ? formatCurrency(course.tuition) : 'Included' },
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
      handleOpenCourse(course.id);
    });
  } else {
    primaryButton.textContent = course.enrollAction?.label || 'Enroll';
    primaryButton.disabled = Boolean(course.enrollAction?.disabled) || course.progress.completed;
    primaryButton.addEventListener('click', event => {
      event.stopPropagation();
      handleEnroll(course);
    });
  }

  actions.appendChild(primaryButton);
  card.appendChild(actions);

  card.addEventListener('click', () => handleOpenCourse(course.id));
  return card;
}

function createProgressBar(course) {
  const wrapper = document.createElement('div');
  wrapper.className = 'learnly-progress';

  const label = document.createElement('span');
  label.className = 'learnly-progress__label';
  if (course.progress.completed) {
    label.textContent = 'Completed';
  } else if (course.progress.enrolled) {
    const remaining = Math.max(0, course.progress.totalDays - course.progress.daysCompleted);
    label.textContent = `${course.progress.daysCompleted}/${course.progress.totalDays} days • ${remaining} left`;
  } else {
    label.textContent = 'Not enrolled yet';
  }

  const bar = document.createElement('div');
  bar.className = 'learnly-progress__bar';
  const fill = document.createElement('span');
  fill.style.width = `${Math.min(100, Math.max(0, course.progress.percent))}%`;
  bar.appendChild(fill);

  wrapper.append(label, bar);
  return wrapper;
}

function renderDetailView() {
  const course = currentContext.courseMap.get(currentState.selectedCourseId);
  if (!course) {
    setState({ view: VIEW_CATALOG });
    return renderCatalogView();
  }

  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--detail';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'learnly-back';
  backButton.textContent = '← Back to catalog';
  backButton.addEventListener('click', () => setState({ view: VIEW_CATALOG, tab: VIEW_CATALOG }));
  section.appendChild(backButton);

  const header = document.createElement('header');
  header.className = 'learnly-detail__header';

  const badges = document.createElement('div');
  badges.className = 'learnly-card__badges';
  course.categories.forEach(categoryId => {
    const category = CATEGORY_DEFINITIONS.find(entry => entry.id === categoryId);
    if (!category) return;
    const badge = document.createElement('span');
    badge.className = 'learnly-badge';
    badge.textContent = category.label;
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
    { label: 'Tuition', value: course.tuition > 0 ? formatCurrency(course.tuition) : 'Included' },
    { label: 'Daily study commitment', value: `${formatHours(course.hoursPerDay)} per day` },
    { label: 'Course length', value: formatDays(course.days) }
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
    `Tuition: ${course.tuition > 0 ? formatCurrency(course.tuition) : 'No upfront cost.'}`,
    `Daily time: Reserve ${formatHours(course.hoursPerDay)} each day.`,
    `Length: Graduate in ${formatDays(course.days)}.`
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
    rewardsBody.textContent = `Finish the full ${formatDays(course.days)} to earn +${course.skillXp} XP across ${describeSkills(course.skills)}.`;
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
    primary.addEventListener('click', () => setState({ view: VIEW_MY_COURSES, tab: VIEW_MY_COURSES }));
  } else {
    primary.textContent = course.enrollAction?.label || 'Enroll now';
    primary.disabled = Boolean(course.enrollAction?.disabled);
    primary.addEventListener('click', () => handleEnroll(course));
  }
  cta.appendChild(primary);
  section.appendChild(cta);

  return section;
}

function renderMyCoursesView() {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--my-courses';

  const intro = document.createElement('div');
  intro.className = 'learnly-my-courses__intro';
  const heading = document.createElement('h2');
  heading.textContent = 'My Courses';
  const note = document.createElement('p');
  note.textContent = `Daily study time reserved: ${formatHours(currentContext.summary.dailyHours)} • Tuition invested: ${formatCurrency(currentContext.summary.tuitionInvested)}`;
  intro.append(heading, note);
  section.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'learnly-enrollment-list';

  const enrolledCourses = currentContext.courses
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
    list.appendChild(createEnrollmentCard(course));
  });

  section.appendChild(list);
  return section;
}

function createEnrollmentCard(course) {
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
  continueButton.addEventListener('click', () => handleOpenCourse(course.id));
  actions.appendChild(continueButton);

  if (course.progress.enrolled && !course.progress.completed) {
    const dropButton = document.createElement('button');
    dropButton.type = 'button';
    dropButton.className = 'learnly-button learnly-button--ghost';
    dropButton.textContent = 'Drop course';
    dropButton.addEventListener('click', () => handleDrop(course));
    actions.appendChild(dropButton);
  }

  card.appendChild(actions);
  return card;
}

function renderPricingView() {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--pricing';

  const heading = document.createElement('h2');
  heading.textContent = 'Pricing & FAQ';
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'learnly-faq';

  const entries = [
    {
      title: 'How does tuition work?',
      body: `Tuition is paid upfront when you enroll. We sink the cost immediately so you can focus on finishing the course. Your current schedule reserves ${formatHours(currentContext.summary.dailyHours)} for active tracks.`
    },
    {
      title: 'What happens to my time?',
      body: 'Learnly books the required hours automatically each morning. Finish your study block to keep progress moving; skipping a day simply pauses advancement.'
    },
    {
      title: 'Why finish a course?',
      body: 'Graduation unlocks new hustle bonuses, boosts payouts, and awards fresh skill XP to push your creator level higher.'
    }
  ];

  entries.forEach(entry => {
    const item = document.createElement('article');
    item.className = 'learnly-faq__item';
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const body = document.createElement('p');
    body.textContent = entry.body;
    item.append(title, body);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function renderView() {
  switch (currentState.view) {
    case VIEW_DETAIL:
      return renderDetailView();
    case VIEW_MY_COURSES:
      return renderMyCoursesView();
    case VIEW_PRICING:
      return renderPricingView();
    case VIEW_CATALOG:
    default:
      return renderCatalogView();
  }
}

function draw() {
  if (!currentMount) return;
  currentMount.innerHTML = '';
  const fragment = document.createDocumentFragment();
  fragment.append(renderHero(), renderTabs(), renderView());
  currentMount.appendChild(fragment);
}

function deriveWorkspacePath() {
  if (currentState.view === VIEW_PRICING) {
    return 'pricing';
  }
  if (currentState.view === VIEW_MY_COURSES) {
    return 'my-courses';
  }
  if (currentState.view === VIEW_DETAIL) {
    const courseId = currentState.selectedCourseId;
    return courseId ? `catalog/${courseId}` : 'catalog';
  }
  return 'catalog';
}

function render(model, { mount, definitions = [], onRouteChange } = {}) {
  currentMount = mount || currentMount;
  if (typeof onRouteChange === 'function') {
    workspacePathController.setListener(onRouteChange);
  }
  currentContext = buildContext(model, definitions);
  if (currentState.view === VIEW_DETAIL) {
    ensureSelectedCourse();
  }
  draw();
  workspacePathController.sync();
  const urlPath = workspacePathController.getPath();

  const active = currentContext.summary.active;
  const meta = active > 0 ? `${active} active course${active === 1 ? '' : 's'}` : 'Browse the catalog';
  return { meta, urlPath };
}

export default { render };
