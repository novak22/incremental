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

export function createOfferItem(offer = {}, { upcoming = false, onAccept, model } = {}) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__offer downwork-marketplace__offer downwork-offer';

  if (!offer.ready || upcoming) {
    item.classList.add('is-upcoming');
  }

  decorateUrgency(item, offer.expiresIn);

  const header = document.createElement('div');
  header.className = 'downwork-offer__header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'downwork-offer__title';

  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = offer.label || 'Contract offer';
  titleBlock.appendChild(title);

  if (offer.payout) {
    const payout = document.createElement('span');
    payout.className = 'downwork-offer__value';
    payout.textContent = `$${formatMoney(offer.payout)}`;
    titleBlock.appendChild(payout);
  }

  header.appendChild(titleBlock);

  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'downwork-offer__actions';

  const button = document.createElement('button');
  button.type = 'button';

  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked && !upcoming;

  if (ready) {
    button.className = 'browser-card__button browser-card__button--primary downwork-offer__button';
    button.textContent = offer.acceptLabel || 'Accept & Queue';
    button.disabled = false;
    if (typeof offer.onAccept === 'function') {
      button.addEventListener('click', () => {
        const payout = resolvePayout(offer, model);
        const focusHours = resolveFocusHours(offer, model);
        if (typeof onAccept === 'function') {
          onAccept({ offer, model, payout, focusHours });
        }
        offer.onAccept();
      });
    }
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

  actionWrapper.appendChild(button);
  header.appendChild(actionWrapper);
  item.appendChild(header);

  const stats = [];
  const payout = resolvePayout(offer, model);
  if (Number.isFinite(payout) && payout > 0) {
    stats.push(`💵 $${formatMoney(payout)}`);
  }
  const focusHours = resolveFocusHours(offer, model);
  if (Number.isFinite(focusHours) && focusHours > 0) {
    stats.push(`⏱️ ${focusHours === 1 ? '1 hour' : `${focusHours} hours`}`);
  }

  if (stats.length > 0) {
    const statList = document.createElement('p');
    statList.className = 'downwork-offer__stats';
    statList.textContent = stats.join(' • ');
    item.appendChild(statList);
  }

  if (offer.description) {
    const summary = document.createElement('p');
    summary.className = 'hustle-card__description';
    summary.textContent = offer.description;
    item.appendChild(summary);
  }

  if (offer.meta) {
    const meta = document.createElement('p');
    meta.className = 'hustle-card__meta';
    meta.textContent = offer.meta;
    item.appendChild(meta);
  }

  if (locked && offer.unlockHint) {
    const note = document.createElement('p');
    note.className = 'downwork-offer__hint';
    note.textContent = offer.unlockHint;
    item.appendChild(note);
  }

  return item;
}

export function createOfferList(offers = [], options = {}) {
  const { upcoming = false } = options;
  const list = document.createElement('ul');
  list.className = 'browser-card__list downwork-marketplace__offer-list';

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
