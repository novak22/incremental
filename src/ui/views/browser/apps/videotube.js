import videotubeApp from '../components/videotube.js';
import { setWorkspacePath } from '../layoutPresenter.js';
import { getPageByType } from './pageLookup.js';

export default function renderVideoTube(context = {}, definitions = [], model = {}) {
  const page = getPageByType('videotube');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="videotube-root"]')) {
      body.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.dataset.role = 'videotube-root';
      body.appendChild(wrapper);
    }
  });
  if (!refs) return null;

  const mount = refs.body.querySelector('[data-role="videotube-root"]');
  if (!mount) return null;

  const handleRouteChange = path => {
    setWorkspacePath(page.id, path);
  };

  const summary = videotubeApp.render(model, {
    mount,
    page,
    definitions,
    onRouteChange: handleRouteChange
  });

  const path = summary?.urlPath || '';
  setWorkspacePath(page.id, path);

  const meta = summary?.meta || model?.summary?.meta || 'Launch your first video';
  return { id: page.id, meta, urlPath: path };
}
