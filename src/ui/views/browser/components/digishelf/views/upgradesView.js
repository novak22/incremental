import { ensureArray } from '../../../../../../core/helpers.js';
import renderPricingCards from '../pricingCards.js';

function describeUpgradeTone(snapshot = {}) {
  if (snapshot.purchased) return 'owned';
  if (snapshot.ready) return 'ready';
  return 'locked';
}

function getDetailEntries(upgrade = {}) {
  const details = ensureArray(upgrade.details);
  if (!details.length) {
    return [];
  }
  return details.filter(entry => {
    if (typeof entry !== 'string') return false;
    const normalized = entry.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith('💵') || normalized.startsWith('boosts:')) {
      return false;
    }
    return true;
  });
}

function renderUpgradeCard(upgrade, { formatCurrency, onPurchaseUpgrade } = {}) {
  const card = document.createElement('article');
  card.className = 'digishelf-upgrade';
  card.dataset.status = describeUpgradeTone(upgrade.snapshot);

  const header = document.createElement('header');
  header.className = 'digishelf-upgrade__header';

  const title = document.createElement('h3');
  title.textContent = upgrade.name || 'Upgrade';
  header.appendChild(title);

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'digishelf-upgrade__tag';
    badge.textContent = upgrade.tag.label;
    header.appendChild(badge);
  }

  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'digishelf-upgrade__summary';
  summary.textContent = upgrade.definition?.description || upgrade.description || 'Upgrade your toolkit.';
  card.appendChild(summary);

  if (upgrade.boosts) {
    const boosts = document.createElement('p');
    boosts.className = 'digishelf-upgrade__boosts';
    boosts.textContent = upgrade.boosts;
    card.appendChild(boosts);
  }

  const detailEntries = getDetailEntries(upgrade);
  if (detailEntries.length) {
    const detailList = document.createElement('ul');
    detailList.className = 'digishelf-upgrade__details';
    detailEntries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'digishelf-upgrade__detail';
      item.innerHTML = entry;
      detailList.appendChild(item);
    });
    card.appendChild(detailList);
  }

  const footer = document.createElement('div');
  footer.className = 'digishelf-upgrade__footer';

  const meta = document.createElement('div');
  meta.className = 'digishelf-upgrade__meta';

  const price = document.createElement('span');
  price.className = 'digishelf-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);

  const status = document.createElement('span');
  status.className = 'digishelf-upgrade__status';
  status.textContent = upgrade.status || 'Progress for this soon';

  meta.append(price, status);

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.className = 'digishelf-button digishelf-button--primary';
  const purchased = Boolean(upgrade.snapshot?.purchased);
  const disabled = purchased || Boolean(upgrade.action?.disabled);
  const actionLabel = upgrade.action?.label
    || (purchased ? 'Owned' : upgrade.snapshot?.ready ? 'Install upgrade' : 'Locked');
  actionButton.textContent = actionLabel;
  actionButton.disabled = disabled;
  actionButton.addEventListener('click', () => {
    if (actionButton.disabled) return;
    if (typeof upgrade.action?.onClick === 'function') {
      upgrade.action.onClick();
      if (typeof onPurchaseUpgrade === 'function') {
        onPurchaseUpgrade(upgrade);
      }
    }
  });

  footer.append(meta, actionButton);
  card.appendChild(footer);

  return card;
}

export default function renderUpgradesView(options = {}) {
  const {
    model = {},
    formatters = {},
    handlers = {}
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const onSelectPlan = handlers.onSelectPlan || (() => {});
  const onPurchaseUpgrade = handlers.onPurchaseUpgrade || (() => {});

  const wrapper = document.createElement('section');
  wrapper.className = 'digishelf-upgrade-view';

  const intro = document.createElement('div');
  intro.className = 'digishelf-upgrade-view__intro';
  intro.innerHTML = '<h2>Creative toolkit upgrades</h2><p>Line your shelves with digital services, automation perks, and creative boosts that keep production flowing.</p>';
  wrapper.appendChild(intro);

  wrapper.appendChild(
    renderPricingCards({
      pricing: model.pricing,
      formatters,
      onSelectPlan,
      emptyMessage: 'Plans appear once you unlock a DigiShelf lane.'
    })
  );

  const catalog = document.createElement('section');
  catalog.className = 'digishelf-upgrade-catalog';

  const header = document.createElement('div');
  header.className = 'digishelf-upgrade-catalog__header';
  const title = document.createElement('h3');
  title.textContent = 'Studio upgrades';
  header.appendChild(title);

  const upgrades = ensureArray(model.upgrades);
  const ownedCount = upgrades.filter(upgrade => upgrade?.snapshot?.purchased).length;
  const totalCount = upgrades.length;
  const summary = document.createElement('p');
  summary.className = 'digishelf-upgrade-catalog__summary';
  if (!totalCount) {
    summary.textContent = 'No DigiShelf upgrades unlocked yet. Launch a resource to reveal new studio boosts.';
  } else if (ownedCount === 0) {
    summary.textContent = 'No upgrades installed yet. Save up and activate boosts when you see the Ready badge.';
  } else if (ownedCount === totalCount) {
    summary.textContent = 'Every upgrade is live! Keep stacking cash for the next content drop.';
  } else {
    summary.textContent = `You own ${ownedCount} of ${totalCount} upgrades. Ready items install instantly when purchased.`;
  }
  header.appendChild(summary);
  catalog.appendChild(header);

  const list = document.createElement('div');
  list.className = 'digishelf-upgrade-list';
  if (!totalCount) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-empty';
    empty.textContent = 'No DigiShelf upgrades unlocked yet. Publish more resources to reveal new services and automation.';
    list.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      list.appendChild(
        renderUpgradeCard(upgrade, {
          formatCurrency,
          onPurchaseUpgrade
        })
      );
    });
  }
  catalog.appendChild(list);
  wrapper.appendChild(catalog);

  return wrapper;
}
