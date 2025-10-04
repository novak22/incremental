import { formatMoney, ensureArray } from '../../../../../core/helpers.js';
import { getAssetState, getUpgradeState } from '../../../../../core/state.js';
import { getAssetDefinition } from '../../../../../core/state/registry.js';

export function formatPrice(amount = 0) {
  const numeric = Number(amount) || 0;
  return `$${formatMoney(Math.max(0, Math.round(numeric)))}`;
}

export function formatKeyLabel(key) {
  if (!key) return '';
  return key
    .toString()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

export function describeTargetScope(scope) {
  if (!scope || typeof scope !== 'object') return '';
  const tags = ensureArray(scope.tags).map(tag => `#${tag}`);
  const ids = ensureArray(scope.ids);
  const families = ensureArray(scope.families).map(formatKeyLabel);
  const categories = ensureArray(scope.categories).map(formatKeyLabel);
  const fragments = [];
  if (ids.length) fragments.push(ids.join(', '));
  if (families.length) fragments.push(`${families.join(', ')} family`);
  if (categories.length) fragments.push(`${categories.join(', ')} category`);
  if (tags.length) fragments.push(tags.join(' • '));
  return fragments.join(' • ');
}

export function describeEffectSummary(definition = {}) {
  const effects = definition.effects || {};
  const affects = definition.affects || {};
  const parts = [];

  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% maintenance speed`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality progress`;
        break;
      default:
        label = `${formatKeyLabel(effect)}: ${numeric}`;
    }
    const targetParts = [];
    const assetScope = describeTargetScope(affects.assets);
    if (assetScope) targetParts.push(`assets (${assetScope})`);
    const hustleScope = describeTargetScope(affects.hustles);
    if (hustleScope) targetParts.push(`hustles (${hustleScope})`);
    const actionScope = ensureArray(affects.actions?.types);
    if (actionScope.length) {
      targetParts.push(`actions (${actionScope.join(', ')})`);
    }
    const summary = targetParts.length ? `${label} → ${targetParts.join(' & ')}` : label;
    parts.push(summary);
  });

  return parts.join(' • ');
}

export function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

export function formatSlotMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

export function stripHtml(value) {
  if (typeof value !== 'string') {
    if (typeof Node !== 'undefined' && value instanceof Node) {
      return value.textContent || '';
    }
    return '';
  }
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.textContent || '';
}

export function isRequirementMet(requirement) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const assetState = getAssetState(requirement.id);
      const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
      if (requirement.active) {
        return instances.filter(instance => instance?.status === 'active').length >= Number(requirement.count || 1);
      }
      return instances.length >= Number(requirement.count || 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

export function formatRequirementHtml(requirement, definitionMap = new Map()) {
  if (!requirement) return 'Requires: <strong>Prerequisites</strong>';
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const upgrade = definitionMap.get(requirement.id);
      const label = upgrade?.name || formatKeyLabel(requirement.id);
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || formatKeyLabel(requirement.id);
      const count = Number(requirement.count || 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

export function getRequirementEntries(definition, { definitionMap = new Map() } = {}) {
  const requirements = ensureArray(definition?.requirements);
  return requirements.map(requirement => ({
    html: formatRequirementHtml(requirement, definitionMap),
    met: isRequirementMet(requirement)
  }));
}

export function collectDetailStrings(definition) {
  const details = ensureArray(definition?.details);
  return details
    .map(detail => {
      if (typeof detail === 'function') {
        try {
          return detail(definition);
        } catch (error) {
          return '';
        }
      }
      return detail;
    })
    .filter(Boolean);
}

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

export function buildHighlights(definition = {}, { definitionMap = new Map() } = {}) {
  const highlights = document.createElement('ul');
  highlights.className = 'shopstack-card__highlights';

  const effectSummary = describeEffectSummary(definition);
  if (effectSummary) {
    const effectItem = document.createElement('li');
    effectItem.textContent = `Bonus: ${effectSummary}`;
    highlights.appendChild(effectItem);
  }

  const requirementEntries = getRequirementEntries(definition, { definitionMap });
  if (requirementEntries.length) {
    const requirementItem = document.createElement('li');
    const unmet = requirementEntries.filter(entry => !entry.met).length;
    const requirementText = requirementEntries
      .map(entry => stripHtml(entry.html).replace(/^Requires:\s*/i, '').trim())
      .join(' • ');
    requirementItem.textContent = unmet
      ? `Needs: ${requirementText}`
      : `Ready: ${requirementText}`;
    highlights.appendChild(requirementItem);
  }

  if (definition.provides || definition.consumes) {
    const list = document.createElement('li');
    const pieces = [];
    if (definition.provides) {
      pieces.push(`Provides: ${formatSlotMap(definition.provides)}`);
    }
    if (definition.consumes) {
      pieces.push(`Consumes: ${formatSlotMap(definition.consumes)}`);
    }
    if (pieces.length) {
      list.innerHTML = pieces.map(text => `<strong>${text}</strong>`).join(' • ');
      highlights.appendChild(list);
    }
  }

  return highlights;
}

export function buildDetailSections(definition = {}, { definitionMap = new Map() } = {}) {
  const sections = [];

  const highlightsSection = document.createElement('section');
  highlightsSection.className = 'shopstack-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'What this gives you';
  highlightsSection.append(highlightsHeading, buildHighlights(definition, { definitionMap }));
  sections.push(highlightsSection);

  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'shopstack-detail__section';
  const requirementsHeading = document.createElement('h3');
  requirementsHeading.textContent = 'Prerequisites';
  requirementsSection.append(
    requirementsHeading,
    buildRequirementList(getRequirementEntries(definition, { definitionMap }))
  );
  sections.push(requirementsSection);

  const specSection = document.createElement('section');
  specSection.className = 'shopstack-detail__section';
  const specHeading = document.createElement('h3');
  specHeading.textContent = 'Deep dive';
  const specList = document.createElement('ul');
  specList.className = 'shopstack-detail__specs';
  const details = collectDetailStrings(definition);
  details.forEach(entry => {
    const item = document.createElement('li');
    if (typeof Node !== 'undefined' && entry instanceof Node) {
      item.appendChild(entry);
    } else {
      item.innerHTML = entry;
    }
    specList.appendChild(item);
  });
  if (!specList.children.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional notes—install and enjoy the boost!';
    specList.appendChild(item);
  }
  specSection.append(specHeading, specList);
  sections.push(specSection);

  return sections;
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

export function createDetailPricing({ item, status }) {
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

export function createDetailCta({ definition, status, onClick }) {
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'shopstack-button shopstack-button--primary shopstack-detail__cta';
  if (status.tone === 'owned') {
    cta.textContent = 'Owned and active';
    cta.disabled = true;
  } else if (status.tone === 'ready') {
    cta.textContent = 'Buy now';
  } else if (status.tone === 'unaffordable') {
    cta.textContent = 'Save up to buy';
    cta.disabled = true;
  } else {
    cta.textContent = 'Locked';
    cta.disabled = true;
  }
  cta.addEventListener('click', () => {
    if (cta.disabled) return;
    onClick?.(cta);
  });
  return cta;
}

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
  const priceRow = createDetailPricing({ item, status });

  const statusRow = document.createElement('div');
  statusRow.className = 'shopstack-detail__status-row';
  statusRow.appendChild(createStatusBadge(status));

  const cta = createDetailCta({ definition: item.definition, status, onClick: button => onBuy?.(item.definition, button) });

  const sections = buildDetailSections(item.definition, { definitionMap });
  container.append(header, priceRow, statusRow, cta, ...sections);
  return container;
}

export default {
  formatPrice,
  formatKeyLabel,
  describeEffectSummary,
  formatSlotLabel,
  formatSlotMap,
  stripHtml,
  isRequirementMet,
  formatRequirementHtml,
  getRequirementEntries,
  collectDetailStrings,
  describeStatus,
  createBadge,
  createStatusBadge,
  buildRequirementList,
  buildHighlights,
  buildDetailSections,
  createDetailHeader,
  createDetailPricing,
  createDetailCta,
  createEmptyDetail,
  buildDetailView
};
