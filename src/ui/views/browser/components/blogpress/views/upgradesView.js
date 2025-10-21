import { ensureArray } from '../../../../../../core/helpers.js';
import createUpgradeCard from './createUpgradeCard.js';
import {
  collectDetailStrings,
  collectUpgradeHighlights,
  describeUpgradeAffordability,
  describeUpgradeSnapshotTone,
  getRequirementEntries
} from '../helpers/upgrades.js';

export function renderUpgradeDetail(upgrade, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    describeSnapshotTone = describeUpgradeSnapshotTone,
    describeAffordability = upgradeEntry =>
      describeUpgradeAffordability(upgradeEntry, { formatCurrency }),
    collectHighlights = collectUpgradeHighlights,
    collectRequirementEntries = getRequirementEntries,
    collectDetailStrings: collectDetails = collectDetailStrings
  } = dependencies;

  const detail = document.createElement('aside');
  detail.className = 'blogpress-upgrade-detail';

  if (!upgrade) {
    const empty = document.createElement('div');
    empty.className = 'blogpress-upgrade-detail__empty';
    empty.textContent = 'Select an upgrade to review highlights, prerequisites, and checkout options.';
    detail.appendChild(empty);
    return detail;
  }

  const tone = describeSnapshotTone(upgrade.snapshot || {});

  const header = document.createElement('header');
  header.className = 'blogpress-upgrade-detail__header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'blogpress-upgrade-detail__title';

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'blogpress-upgrade-detail__tag';
    badge.textContent = upgrade.tag.label;
    titleBlock.appendChild(badge);
  }

  const heading = document.createElement('h2');
  heading.textContent = upgrade.name;
  titleBlock.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.className = 'blogpress-upgrade-detail__blurb';
  blurb.textContent = upgrade.description || 'Blog boost';
  titleBlock.appendChild(blurb);

  const priceBlock = document.createElement('div');
  priceBlock.className = 'blogpress-upgrade-detail__price';
  const priceLabel = document.createElement('span');
  priceLabel.textContent = 'Price';
  const priceValue = document.createElement('strong');
  priceValue.textContent = formatCurrency(upgrade.cost || 0);
  priceBlock.append(priceLabel, priceValue);

  header.append(titleBlock, priceBlock);

  const statusRow = document.createElement('div');
  statusRow.className = 'blogpress-upgrade-detail__status-row';

  const statusBadge = document.createElement('span');
  statusBadge.className = 'blogpress-upgrade-detail__badge';
  if (tone) {
    statusBadge.classList.add(`blogpress-upgrade-detail__badge--${tone}`);
  }
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
  statusNote.className = 'blogpress-upgrade-detail__note';
  statusNote.textContent = describeAffordability(upgrade);

  statusRow.append(statusBadge, statusNote);

  const actions = document.createElement('div');
  actions.className = 'blogpress-upgrade-detail__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--primary';
  if (upgrade.snapshot?.purchased) {
    button.textContent = 'Owned and active';
    button.disabled = true;
  } else if (upgrade.snapshot?.ready) {
    button.textContent = 'Buy upgrade';
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
  highlightsSection.className = 'blogpress-upgrade-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'Highlights';
  const highlightList = document.createElement('ul');
  highlightList.className = 'blogpress-upgrade-detail__list';
  const highlightEntries = collectHighlights(upgrade);
  if (!highlightEntries.length) {
    const item = document.createElement('li');
    item.textContent = 'Stacks with blog payouts and writing rituals.';
    highlightList.appendChild(item);
  } else {
    highlightEntries.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlightList.appendChild(item);
    });
  }
  highlightsSection.append(highlightsHeading, highlightList);

  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'blogpress-upgrade-detail__section';
  const requirementsHeading = document.createElement('h3');
  requirementsHeading.textContent = 'Prerequisites';
  const requirementList = document.createElement('ul');
  requirementList.className = 'blogpress-upgrade-detail__requirements';
  const requirementEntries = collectRequirementEntries(upgrade);
  if (!requirementEntries.length) {
    const item = document.createElement('li');
    item.className = 'blogpress-upgrade-detail__requirement is-met';
    item.textContent = 'No prerequisites — ready when you are!';
    requirementList.appendChild(item);
  } else {
    requirementEntries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'blogpress-upgrade-detail__requirement';
      if (entry.met) {
        item.classList.add('is-met');
      }
      const icon = document.createElement('span');
      icon.className = 'blogpress-upgrade-detail__requirement-icon';
      icon.textContent = entry.met ? '✓' : '•';
      const text = document.createElement('span');
      text.className = 'blogpress-upgrade-detail__requirement-text';
      text.innerHTML = entry.html || '';
      item.append(icon, text);
      requirementList.appendChild(item);
    });
  }
  requirementsSection.append(requirementsHeading, requirementList);

  const detailsSection = document.createElement('section');
  detailsSection.className = 'blogpress-upgrade-detail__section';
  const detailsHeading = document.createElement('h3');
  detailsHeading.textContent = 'Detailed specs';
  const detailList = document.createElement('ul');
  detailList.className = 'blogpress-upgrade-detail__list';
  const details = collectDetails(upgrade.definition || {});
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
        item.innerHTML = String(entry);
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
    describeSnapshotTone,
    describeAffordability,
    collectHighlights,
    collectRequirementEntries,
    collectDetailStrings: collectDetails
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const resolveSnapshotTone = describeSnapshotTone || describeUpgradeSnapshotTone;
  const resolveAffordability = describeAffordability
    || (upgrade => describeUpgradeAffordability(upgrade, { formatCurrency }));
  const resolveHighlights = collectHighlights || collectUpgradeHighlights;
  const resolveRequirements = collectRequirementEntries || getRequirementEntries;
  const resolveDetails = collectDetails || collectDetailStrings;

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--upgrades';

  const intro = document.createElement('div');
  intro.className = 'blogpress-upgrades__intro';
  intro.innerHTML = '<h2>BlogPress upgrade studio</h2><p>Shop workflow, SEO, and comfort boosts to keep every post humming along.</p>';

  const layout = document.createElement('div');
  layout.className = 'blogpress-upgrades__layout';

  const catalog = document.createElement('div');
  catalog.className = 'blogpress-upgrades__catalog';
  catalog.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'blogpress-upgrades';
  const upgrades = ensureArray(model.upgrades);
  if (!upgrades.length) {
    const empty = document.createElement('p');
    empty.className = 'blogpress-empty blogpress-upgrades__empty';
    empty.textContent = 'No upgrades unlocked yet. Launch your first blog to reveal cozy boosts.';
    list.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      list.appendChild(
        createUpgradeCard(upgrade, state, {
          formatCurrency,
          describeSnapshotTone: resolveSnapshotTone,
          collectHighlights: resolveHighlights,
          onSelect: handlers.onSelectUpgrade || (() => {})
        })
      );
    });
  }

  catalog.appendChild(list);

  const selectedUpgrade = selectors.getSelectedUpgrade
    ? selectors.getSelectedUpgrade(state, model)
    : null;

  layout.append(
    catalog,
    renderUpgradeDetail(selectedUpgrade, {
      formatCurrency,
      describeSnapshotTone: resolveSnapshotTone,
      describeAffordability: resolveAffordability,
      collectHighlights: resolveHighlights,
      collectRequirementEntries: resolveRequirements,
      collectDetailStrings: resolveDetails
    })
  );

  container.appendChild(layout);

  return container;
}
