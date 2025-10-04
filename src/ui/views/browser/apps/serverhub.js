import serverhubApp from '../components/serverhub.js';
import { getPageByType } from './pageLookup.js';

export default function renderServerHub(context = {}, definitions = [], model = {}) {
  const page = getPageByType('serverhub');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="serverhub-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'serverhub-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="serverhub-root"]');
  if (!mount) return null;

  const summary = serverhubApp.render(model, { mount, page, definitions });
  const meta = summary?.meta || model?.summary?.meta || 'Launch your first micro SaaS';
  const urlPath = summary?.urlPath || '';
  return { id: page.id, meta, urlPath };
}
