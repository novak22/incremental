import { formatMoney } from '../../../../../core/helpers.js';
import { decorateUrgency } from './urgency.js';

function resolveFocusHours(offer = {}, model = {}) {
  if (Number.isFinite(offer.hoursRequired)) {
    return offer.hoursRequired;
  }
  if (Number.isFinite(model.metrics?.time?.value)) {
    return model.metrics.time.value;
  }
  return null;
}

function resolvePayout(offer = {}, model = {}) {
  if (Number.isFinite(offer.payout)) {
    return offer.payout;
  }
  if (Number.isFinite(model.metrics?.payout?.value)) {
    return model.metrics.payout.value;
  }
  return 0;
}

export function createOfferItem(
  offer = {},
  { upcoming = false, onAccept, model, actionModel } = {}
) {
  const item = document.createElement('article');
  item.className = 'downwork-offer downwork-marketplace__offer';

  if (!offer.ready || upcoming) {
    item.classList.add('is-upcoming');
  }

  decorateUrgency(item, offer.expiresIn);

  const topRow = document.createElement('div');
  topRow.className = 'downwork-offer__top';

  const title = document.createElement('h3');
  title.className = 'downwork-offer__title';
  title.textContent = offer.label || 'Contract offer';
  topRow.appendChild(title);

  const payoutValue = resolvePayout(offer, model);
  if (Number.isFinite(payoutValue) && payoutValue > 0) {
    const payout = document.createElement('span');
    payout.className = 'downwork-offer__value';
    payout.textContent = `$${formatMoney(payoutValue)}`;
    topRow.appendChild(payout);
  }

  item.appendChild(topRow);

  const metrics = [];
  if (Number.isFinite(payoutValue) && payoutValue > 0) {
    metrics.push(`💵 $${formatMoney(payoutValue)}`);
  }
  const focusHours = resolveFocusHours(offer, model);
  if (Number.isFinite(focusHours) && focusHours > 0) {
    metrics.push(`⏱️ ${focusHours === 1 ? '1 hour' : `${focusHours} hours`}`);
  }

  if (metrics.length > 0) {
    const metricRow = document.createElement('div');
    metricRow.className = 'downwork-offer__metrics';
    metrics.forEach(entry => {
      const chip = document.createElement('span');
      chip.className = 'downwork-offer__metric';
      chip.textContent = entry;
      metricRow.appendChild(chip);
    });
    item.appendChild(metricRow);
  }

  if (offer.description) {
    const summary = document.createElement('p');
    summary.className = 'downwork-offer__description';
    summary.textContent = offer.description;
    item.appendChild(summary);
  }

  if (offer.meta) {
    const meta = document.createElement('p');
    meta.className = 'downwork-offer__meta';
    meta.textContent = offer.meta;
    item.appendChild(meta);
  }

  const button = document.createElement('button');
  button.type = 'button';

  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked && !upcoming;

  if (ready) {
    button.className = 'browser-card__button browser-card__button--primary downwork-offer__button';
    const readyLabel = offer.acceptLabel
      || offer.action?.label
      || actionModel?.label
      || (offer.label ? `Accept ${offer.label}` : 'Accept & Queue');
    button.textContent = readyLabel;
    button.disabled = false;
    const clickHandlers = new Set();
    if (typeof actionModel?.onClick === 'function') {
      clickHandlers.add(actionModel.onClick);
    }
    if (typeof offer.action?.onClick === 'function') {
      clickHandlers.add(offer.action.onClick);
    }
    if (typeof offer.onAccept === 'function') {
      clickHandlers.add(offer.onAccept);
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const payout = resolvePayout(offer, model);
      const focusHours = resolveFocusHours(offer, model);
      if (typeof onAccept === 'function') {
        onAccept({ offer, model, payout, focusHours });
      }
      clickHandlers.forEach(handler => handler());
    });
  } else {
    button.className = 'browser-card__button downwork-offer__button';
    if (locked) {
      button.textContent = offer.lockedLabel || 'Locked';
      button.disabled = true;
      if (offer.unlockHint) {
        button.title = offer.unlockHint;
      }
    } else {
      const availableIn = Number.isFinite(offer.availableIn) ? offer.availableIn : null;
      const days = availableIn === 1 ? '1 day' : `${availableIn} days`;
      button.textContent = availableIn && availableIn > 0 ? `Opens in ${days}` : 'Upcoming';
      button.disabled = true;
    }
  }

  item.appendChild(button);

  if (locked && offer.unlockHint) {
    const note = document.createElement('p');
    note.className = 'downwork-offer__hint';
    note.textContent = offer.unlockHint;
    item.appendChild(note);
  }

  return item;
}

export function createOfferList(offers = [], options = {}) {
  const list = document.createElement('div');
  list.className = 'downwork-marketplace__offer-list';

  offers.filter(Boolean).forEach(offer => {
    const item = createOfferItem(offer, options);
    list.appendChild(item);
  });

  return list;
}

export default {
  createOfferItem,
  createOfferList
};
