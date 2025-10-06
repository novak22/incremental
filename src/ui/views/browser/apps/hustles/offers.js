import { formatMoney } from '../../../../../core/helpers.js';
import { decorateUrgency } from './urgency.js';

export function createOfferItem(offer = {}, { upcoming = false } = {}) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__offer';

  if (!offer.ready || upcoming) {
    item.classList.add('is-upcoming');
  }

  decorateUrgency(item, offer.expiresIn);

  const header = document.createElement('div');
  header.className = 'hustle-card__row';

  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = offer.label || 'Contract offer';
  header.appendChild(title);

  if (offer.payout) {
    const payout = document.createElement('span');
    payout.className = 'hustle-card__value';
    payout.textContent = `$${formatMoney(offer.payout)}`;
    header.appendChild(payout);
  }

  item.appendChild(header);

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

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';

  const button = document.createElement('button');
  button.type = 'button';

  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked && !upcoming;

  if (ready) {
    button.className = 'browser-card__button browser-card__button--primary';
    button.textContent = offer.acceptLabel || 'Accept offer';
    button.disabled = false;
    if (typeof offer.onAccept === 'function') {
      button.addEventListener('click', () => {
        offer.onAccept();
      });
    }
  } else {
    button.className = 'browser-card__button';
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

  actions.appendChild(button);

  if (locked && offer.unlockHint) {
    const note = document.createElement('p');
    note.className = 'browser-card__note';
    note.textContent = offer.unlockHint;
    actions.appendChild(note);
  }

  item.appendChild(actions);

  return item;
}

export function createOfferList(offers = [], { upcoming = false } = {}) {
  const list = document.createElement('ul');
  list.className = 'browser-card__list';

  offers.filter(Boolean).forEach(offer => {
    const item = createOfferItem(offer, { upcoming });
    list.appendChild(item);
  });

  return list;
}

export default {
  createOfferItem,
  createOfferList
};
