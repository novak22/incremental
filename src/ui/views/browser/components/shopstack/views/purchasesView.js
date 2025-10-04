import { getState, getUpgradeState } from '../../../../../../core/state.js';
import {
  collectDetailStrings,
  describeEffectSummary,
  stripHtml
} from '../detailBuilders.js';
import { collectCatalogItems } from '../catalogData.js';

function isRepeatableOwned(definition, upgradeState = {}) {
  if (!definition?.repeatable) return false;
  const count = Number(upgradeState.count);
  return Number.isFinite(count) && count > 0;
}

function collectPurchases(model = {}, definitionMap = new Map()) {
  const state = getState();
  const items = collectCatalogItems(model, definitionMap);
  const purchases = [];
  items.forEach(item => {
    const snapshot = item.model?.snapshot || {};
    const upgradeState = getUpgradeState(item.model?.id, state) || {};
    if (snapshot.purchased || isRepeatableOwned(item.definition, upgradeState)) {
      purchases.push({ ...item, snapshot, upgradeState });
    }
  });
  purchases.sort((a, b) => {
    const dayA = Number(a.upgradeState?.purchasedDay);
    const dayB = Number(b.upgradeState?.purchasedDay);
    if (!Number.isFinite(dayA) && !Number.isFinite(dayB)) return a.model.name.localeCompare(b.model.name);
    if (!Number.isFinite(dayA)) return 1;
    if (!Number.isFinite(dayB)) return -1;
    return dayA - dayB;
  });
  return purchases;
}

function describePurchaseDay(upgradeState) {
  const day = Number(upgradeState?.purchasedDay);
  if (Number.isFinite(day) && day > 0) {
    return `Purchased: Day ${day}`;
  }
  return 'Purchased earlier this run';
}

function describeUpkeep(highlights) {
  const upkeep = highlights.find(text => /payroll|per day|upkeep|subscription|daily limit/i.test(text));
  return upkeep || null;
}

export default function renderPurchasesView({ model, definitionMap }) {
  const section = document.createElement('section');
  section.className = 'shopstack-purchases';

  const purchases = collectPurchases(model, definitionMap);
  if (!purchases.length) {
    const empty = document.createElement('div');
    empty.className = 'shopstack-empty';
    empty.textContent = 'No upgrades owned yet. Grab a boost from the catalog to see it listed here.';
    section.appendChild(empty);
    return section;
  }

  purchases.forEach(purchase => {
    const { model: itemModel, definition, upgradeState } = purchase;
    const card = document.createElement('article');
    card.className = 'shopstack-purchase';

    const header = document.createElement('header');
    header.className = 'shopstack-purchase__header';

    const title = document.createElement('h3');
    title.className = 'shopstack-purchase__title';
    title.textContent = itemModel.name;

    const badge = document.createElement('span');
    badge.className = 'shopstack-status shopstack-status--owned';
    badge.textContent = 'Owned';

    header.append(title, badge);

    const meta = document.createElement('p');
    meta.className = 'shopstack-purchase__meta';
    meta.textContent = describePurchaseDay(upgradeState);

    const effectSummary = describeEffectSummary(definition);
    const highlights = collectDetailStrings(definition).map(entry => stripHtml(entry));
    const upkeepSummary = describeUpkeep(highlights);

    const summaryList = document.createElement('ul');
    summaryList.className = 'shopstack-purchase__highlights';

    if (effectSummary) {
      const effectItem = document.createElement('li');
      effectItem.textContent = `Bonus: ${effectSummary}`;
      summaryList.appendChild(effectItem);
    }

    if (upkeepSummary) {
      const upkeepItem = document.createElement('li');
      upkeepItem.textContent = `Upkeep: ${upkeepSummary}`;
      summaryList.appendChild(upkeepItem);
    }

    if (definition.repeatable && Number(upgradeState?.count || 0) > 0) {
      const countItem = document.createElement('li');
      countItem.textContent = `Active hires: ${upgradeState.count}`;
      summaryList.appendChild(countItem);
    }

    if (!summaryList.children.length) {
      const fallback = document.createElement('li');
      fallback.textContent = 'Perks active — keep the hours funded to enjoy the benefits.';
      summaryList.appendChild(fallback);
    }

    const description = document.createElement('p');
    description.className = 'shopstack-purchase__description';
    description.textContent = itemModel.description || 'Active bonus humming along.';

    card.append(header, meta, description, summaryList);
    section.appendChild(card);
  });

  return section;
}
