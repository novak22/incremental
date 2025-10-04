import { createDetailCta } from './cta.js';
import { buildDetailSections } from './sections.js';
import { createDetailHeader, createDetailPricing, createStatusBadge, describeStatus } from './statusHeader.js';

export function createEmptyDetail() {
  const container = document.createElement('div');
  container.className = 'shopstack-detail__empty';
  container.textContent = 'Select an upgrade to preview its perks and requirements.';
  return container;
}

export function buildDetailView({ item, onBuy, definitionMap = new Map() }) {
  const container = document.createElement('aside');
  container.className = 'shopstack-detail';

  if (!item) {
    container.appendChild(createEmptyDetail());
    return container;
  }

  const status = describeStatus(item?.model?.snapshot || {});
  const header = createDetailHeader({ item, status });
  const priceRow = createDetailPricing({ item });

  const statusRow = document.createElement('div');
  statusRow.className = 'shopstack-detail__status-row';
  statusRow.appendChild(createStatusBadge(status));

  const cta = createDetailCta({ status, onClick: button => onBuy?.(item.definition, button) });

  const sections = buildDetailSections(item.definition, { definitionMap });
  container.append(header, priceRow, statusRow, cta, ...sections);
  return container;
}

export default {
  createEmptyDetail,
  buildDetailView
};
