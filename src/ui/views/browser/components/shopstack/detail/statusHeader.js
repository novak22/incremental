import { formatPrice } from './formatting.js';

export function describeStatus(snapshot = {}) {
  if (snapshot.purchased) {
    return { label: 'Owned', tone: 'owned', description: 'Already installed and active.' };
  }
  if (snapshot.ready) {
    return { label: 'Ready to buy', tone: 'ready', description: 'Cash on hand and prerequisites met.' };
  }
  if (!snapshot.affordable) {
    return { label: 'Save up', tone: 'unaffordable', description: 'Stack more cash to unlock this upgrade.' };
  }
  if (snapshot.disabled) {
    return { label: 'Locked', tone: 'locked', description: 'Meet the prerequisites to make this available.' };
  }
  return { label: 'Unavailable', tone: 'locked', description: 'Check requirements to unlock.' };
}

export function createBadge(label, tone = 'default') {
  if (!label) return null;
  const badge = document.createElement('span');
  badge.className = `shopstack-badge shopstack-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

export function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `shopstack-status shopstack-status--${status.tone}`;
  badge.textContent = status.label;
  badge.title = status.description;
  return badge;
}

export function createDetailHeader({ item, status }) {
  const header = document.createElement('header');
  header.className = 'shopstack-detail__header';

  const breadcrumbs = document.createElement('p');
  breadcrumbs.className = 'shopstack-detail__breadcrumbs';
  const pieces = [];
  if (item?.category?.copy?.label) pieces.push(item.category.copy.label);
  if (item?.family?.copy?.label) pieces.push(item.family.copy.label);
  breadcrumbs.textContent = pieces.length ? pieces.join(' • ') : 'ShopStack';

  const title = document.createElement('h2');
  title.className = 'shopstack-detail__title';
  title.textContent = item?.model?.name || 'Select an upgrade';

  const tagline = document.createElement('p');
  tagline.className = 'shopstack-detail__tagline';
  tagline.textContent = item?.model?.tagline || item?.definition?.tagline || '';

  header.append(breadcrumbs, title, tagline);
  return header;
}

export function createDetailPricing({ item }) {
  const priceRow = document.createElement('div');
  priceRow.className = 'shopstack-detail__price-row';

  const price = document.createElement('span');
  price.className = 'shopstack-detail__price';
  price.textContent = formatPrice(item?.model?.cost);

  const affordability = document.createElement('span');
  affordability.className = 'shopstack-detail__affordability';
  affordability.textContent = item?.model?.snapshot?.affordable
    ? 'Funds ready'
    : 'Save up for this bonus';

  priceRow.append(price, affordability);
  return priceRow;
}

export default {
  describeStatus,
  createBadge,
  createStatusBadge,
  createDetailHeader,
  createDetailPricing
};
