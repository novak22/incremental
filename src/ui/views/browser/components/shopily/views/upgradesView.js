import { ensureArray } from '../../../../../../core/helpers.js';
import createUpgradeCard from '../upgradeCard.js';

export function renderUpgradeDetail(upgrade, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    describeSnapshotTone = () => 'locked',
    describeAffordability = () => 'Progress the requirements to unlock this purchase.',
    collectHighlights = () => [],
    collectRequirementEntries = () => [],
    collectDetailStrings = () => []
  } = dependencies;

  const detail = document.createElement('aside');
  detail.className = 'shopily-upgrade-detail';

  if (!upgrade) {
    const empty = document.createElement('div');
    empty.className = 'shopily-upgrade-detail__empty';
    empty.textContent = 'Select an upgrade to review requirements, highlights, and checkout.';
    detail.appendChild(empty);
    return detail;
  }

  const tone = describeSnapshotTone(upgrade.snapshot);

  const header = document.createElement('header');
  header.className = 'shopily-upgrade-detail__header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'shopily-upgrade-detail__title';

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'shopily-upgrade-detail__tag';
    badge.textContent = upgrade.tag.label;
    titleBlock.appendChild(badge);
  }

  const heading = document.createElement('h2');
  heading.textContent = upgrade.name;
  titleBlock.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.className = 'shopily-upgrade-detail__blurb';
  blurb.textContent = upgrade.description || 'Commerce boost';
  titleBlock.appendChild(blurb);

  const priceBlock = document.createElement('div');
  priceBlock.className = 'shopily-upgrade-detail__price';
  const priceLabel = document.createElement('span');
  priceLabel.textContent = 'Price';
  const priceValue = document.createElement('strong');
  priceValue.textContent = formatCurrency(upgrade.cost || 0);
  priceBlock.append(priceLabel, priceValue);

  header.append(titleBlock, priceBlock);

  const statusRow = document.createElement('div');
  statusRow.className = 'shopily-upgrade-detail__status-row';

  const statusBadge = document.createElement('span');
  statusBadge.className = `shopily-upgrade-detail__badge shopily-upgrade-detail__badge--${tone}`;
  if (upgrade.snapshot?.purchased) {
    statusBadge.textContent = 'Owned';
  } else if (upgrade.snapshot?.ready) {
    statusBadge.textContent = 'Ready to buy';
  } else if (upgrade.snapshot?.affordable === false) {
    statusBadge.textContent = 'Save up';
  } else {
    statusBadge.textContent = 'Locked';
  }

  const statusNote = document.createElement('p');
  statusNote.className = 'shopily-upgrade-detail__note';
  statusNote.textContent = describeAffordability(upgrade);

  statusRow.append(statusBadge, statusNote);

  const actions = document.createElement('div');
  actions.className = 'shopily-upgrade-detail__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-button shopily-button--primary';
  if (upgrade.snapshot?.purchased) {
    button.textContent = 'Owned and active';
    button.disabled = true;
  } else if (upgrade.snapshot?.ready) {
    button.textContent = 'Buy now';
  } else if (upgrade.snapshot?.affordable === false) {
    button.textContent = 'Save up to buy';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    upgrade.action?.onClick?.();
  });
  actions.appendChild(button);

  const highlightsSection = document.createElement('section');
  highlightsSection.className = 'shopily-upgrade-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'Highlights';
  const highlightList = document.createElement('ul');
  highlightList.className = 'shopily-upgrade-detail__list';
  const detailHighlights = collectHighlights(upgrade);
  if (!detailHighlights.length) {
    const item = document.createElement('li');
    item.textContent = 'Instantly boosts dropshipping payouts and action progress.';
    highlightList.appendChild(item);
  } else {
    detailHighlights.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlightList.appendChild(item);
    });
  }
  highlightsSection.append(highlightsHeading, highlightList);

  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'shopily-upgrade-detail__section';
  const requirementsHeading = document.createElement('h3');
  requirementsHeading.textContent = 'Prerequisites';
  const requirementList = document.createElement('ul');
  requirementList.className = 'shopily-upgrade-detail__requirements';
  const requirementEntries = collectRequirementEntries(upgrade);
  if (!requirementEntries.length) {
    const item = document.createElement('li');
    item.className = 'shopily-upgrade-detail__requirement is-met';
    item.textContent = 'No prerequisites — ready when you are!';
    requirementList.appendChild(item);
  } else {
    requirementEntries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-upgrade-detail__requirement';
      if (entry.met) {
        item.classList.add('is-met');
      }
      const icon = document.createElement('span');
      icon.className = 'shopily-upgrade-detail__requirement-icon';
      icon.textContent = entry.met ? '✓' : '•';
      const text = document.createElement('span');
      text.className = 'shopily-upgrade-detail__requirement-text';
      text.innerHTML = entry.html;
      item.append(icon, text);
      requirementList.appendChild(item);
    });
  }
  requirementsSection.append(requirementsHeading, requirementList);

  const detailsSection = document.createElement('section');
  detailsSection.className = 'shopily-upgrade-detail__section';
  const detailsHeading = document.createElement('h3');
  detailsHeading.textContent = 'Detailed specs';
  const detailList = document.createElement('ul');
  detailList.className = 'shopily-upgrade-detail__list';
  const details = collectDetailStrings(upgrade.definition);
  if (!details.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional notes — install and enjoy the boost!';
    detailList.appendChild(item);
  } else {
    details.forEach(entry => {
      const item = document.createElement('li');
      if (typeof Node !== 'undefined' && entry instanceof Node) {
        item.appendChild(entry);
      } else {
        item.innerHTML = entry;
      }
      detailList.appendChild(item);
    });
  }
  detailsSection.append(detailsHeading, detailList);

  detail.append(header, statusRow, actions, highlightsSection, requirementsSection, detailsSection);
  return detail;
}

export default function renderUpgradesView(options = {}) {
  const {
    model = {},
    state = {},
    formatters = {},
    handlers = {},
    selectors = {},
    describeSnapshotTone = () => 'locked',
    describeAffordability = () => 'Progress the requirements to unlock this purchase.',
    collectHighlights = () => [],
    collectRequirementEntries = () => [],
    collectDetailStrings = () => []
  } = options;

  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--upgrades';

  const intro = document.createElement('div');
  intro.className = 'shopily-upgrades__intro';
  intro.innerHTML = '<h2>Commerce upgrade ladder</h2><p>These infrastructure plays reuse the existing upgrade logic so every purchase hits immediately.</p>';

  const layout = document.createElement('div');
  layout.className = 'shopily-upgrades__layout';

  const catalog = document.createElement('div');
  catalog.className = 'shopily-upgrades__catalog';
  catalog.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'shopily-upgrades';
  const upgrades = ensureArray(model.upgrades);
  if (!upgrades.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-empty';
    empty.textContent = 'No commerce upgrades unlocked yet. Build more stores and finish the E-Commerce Playbook to reveal new boosts.';
    list.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      list.appendChild(
        createUpgradeCard(upgrade, state, {
          formatCurrency: formatters.formatCurrency,
          describeSnapshotTone,
          collectHighlights,
          onSelect: handlers.onSelectUpgrade
        })
      );
    });
  }

  catalog.appendChild(list);

  const selectedUpgrade = selectors.getSelectedUpgrade ? selectors.getSelectedUpgrade(state, model) : null;
  layout.append(
    catalog,
    renderUpgradeDetail(selectedUpgrade, {
      formatCurrency: formatters.formatCurrency,
      describeSnapshotTone,
      describeAffordability,
      collectHighlights,
      collectRequirementEntries,
      collectDetailStrings
    })
  );
  container.appendChild(layout);

  return container;
}
