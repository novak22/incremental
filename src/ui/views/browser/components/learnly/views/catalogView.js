import renderCategoryFilter from './categoryFilter.js';
import { createCourseCard } from './shared/courseCard.js';
import { VIEW_CATALOG } from '../constants.js';

export default function renderCatalogView({ state, context, formatters, handlers }) {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--catalog';

  const filter = renderCategoryFilter({
    categories: context.categories,
    activeCategory: state.category,
    handlers: {
      onSelectCategory: handlers.onSelectCategory
    }
  });

  const catalog = document.createElement('div');
  catalog.className = 'learnly-grid';

  const filteredCourses = context.catalogCourses.filter(course => {
    if (state.category === 'all') return true;
    return course.categories.includes(state.category);
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
      catalog.appendChild(
        createCourseCard({
          course,
          formatters,
          handlers,
          sourceTab: state.tab || VIEW_CATALOG
        })
      );
    });
  }

  section.append(filter, catalog);
  return section;
}
