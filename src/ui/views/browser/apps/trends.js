import { render as renderTrendsComponent } from '../components/trends.js';
import { getPageByType } from './pageLookup.js';

export default function renderTrends(context = {}, model = {}) {
  const page = getPageByType('trends');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="trends-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'trends-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="trends-root"]');
  if (!mount) return null;

  const summary = renderTrendsComponent(model, { mount, page });
  const meta = summary?.meta || model?.highlights?.hot?.title || 'Trend insights ready';
  return { id: page.id, meta };
}
