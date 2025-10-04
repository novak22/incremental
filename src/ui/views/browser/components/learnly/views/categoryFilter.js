export default function renderCategoryFilter({ categories = [], activeCategory = 'all', handlers = {} }) {
  const { onSelectCategory } = handlers;
  const filter = document.createElement('div');
  filter.className = 'learnly-filter';

  categories.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learnly-filter__button';
    if (activeCategory === category.id) {
      button.classList.add('is-active');
    }
    button.textContent = category.count ? `${category.label} (${category.count})` : category.label;
    button.addEventListener('click', () => {
      if (typeof onSelectCategory === 'function') {
        onSelectCategory(category.id);
      }
    });
    filter.appendChild(button);
  });

  return filter;
}
