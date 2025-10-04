import { ensureArray } from '../../../../../../core/helpers.js';

export function buildRequirementList(entries = []) {
  const list = document.createElement('ul');
  list.className = 'shopstack-detail__requirements';
  ensureArray(entries).forEach(entry => {
    const item = document.createElement('li');
    item.className = 'shopstack-detail__requirement';
    if (entry?.met) {
      item.classList.add('is-met');
    }
    const icon = document.createElement('span');
    icon.className = 'shopstack-detail__requirement-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = entry?.met ? '✅' : '⏳';
    const text = document.createElement('span');
    text.className = 'shopstack-detail__requirement-text';
    text.innerHTML = entry?.html || '';
    item.append(icon, text);
    list.appendChild(item);
  });
  if (!list.children.length) {
    const item = document.createElement('li');
    item.className = 'shopstack-detail__requirement is-met';
    const icon = document.createElement('span');
    icon.className = 'shopstack-detail__requirement-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✅';
    const text = document.createElement('span');
    text.className = 'shopstack-detail__requirement-text';
    text.textContent = 'No prerequisites — buy when ready!';
    item.append(icon, text);
    list.appendChild(item);
  }
  return list;
}

export default {
  buildRequirementList
};
