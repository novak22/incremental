import learnlyApp from '../components/learnly.js';
import { getPageByType } from './pageLookup.js';

export default function renderEducation(context = {}, definitions = [], model = {}) {
  const page = getPageByType('education');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="learnly-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'learnly';
      wrapper.dataset.role = 'learnly-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="learnly-root"]');
  if (!mount) return null;

  const summary = learnlyApp.render(model, { mount, page, definitions });
  const meta = summary?.meta || 'Browse the catalog';
  return { id: page.id, meta };
}
