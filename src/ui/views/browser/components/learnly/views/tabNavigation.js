import { VIEW_CATALOG, VIEW_FREE, VIEW_MY_COURSES, VIEW_PRICING } from '../constants.js';

export default function renderTabNavigation({ activeTab, badges = {}, handlers = {} }) {
  const { onOpenTab } = handlers;
  const nav = document.createElement('nav');
  nav.className = 'learnly-tabs';

  const tabs = [
    { id: VIEW_CATALOG, label: 'Catalog', badge: badges.catalog },
    { id: VIEW_FREE, label: 'Free Courses', badge: badges.free },
    { id: VIEW_MY_COURSES, label: 'My Courses', badge: badges.myCourses },
    { id: VIEW_PRICING, label: 'Pricing Info', badge: badges.pricing }
  ];

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learnly-tab';
    if (activeTab === tab.id) {
      button.classList.add('is-active');
    }
    button.textContent = tab.label;
    if (tab.badge) {
      const badge = document.createElement('span');
      badge.className = 'learnly-tab__badge';
      badge.textContent = tab.badge;
      button.appendChild(badge);
    }
    button.addEventListener('click', () => {
      if (typeof onOpenTab === 'function') {
        onOpenTab(tab.id);
      }
    });
    nav.appendChild(button);
  });

  return nav;
}
