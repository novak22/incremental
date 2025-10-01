import { getElement } from '../../../elements/registry.js';

export function showSlideOver({ eyebrow, title, body }) {
  const {
    slideOver,
    slideOverContent,
    slideOverEyebrow,
    slideOverTitle
  } = getElement('slideOver') || {};
  if (!slideOver || !slideOverContent) return;
  slideOverEyebrow.textContent = eyebrow || '';
  slideOverTitle.textContent = title || '';
  slideOverContent.innerHTML = '';
  if (Array.isArray(body)) {
    body.forEach(node => slideOverContent.appendChild(node));
  } else if (body instanceof Node) {
    slideOverContent.appendChild(body);
  } else if (typeof body === 'string') {
    const p = document.createElement('p');
    p.textContent = body;
    slideOverContent.appendChild(p);
  }
  slideOver.hidden = false;
  slideOver.focus();
}

export default showSlideOver;
