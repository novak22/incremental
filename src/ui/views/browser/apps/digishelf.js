import digishelfApp from '../components/digishelf.js';
import { getPageByType } from './pageLookup.js';

export default function renderDigishelf(context = {}, definitions = [], model = {}) {
  const page = getPageByType('digishelf');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="digishelf-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'digishelf-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="digishelf-root"]');
  if (!mount) return null;

  const summary = digishelfApp.render(model, { mount, page, definitions });
  const meta = summary?.meta || model?.summary?.meta || 'Publish your first resource';
  return { id: page.id, meta };
}
