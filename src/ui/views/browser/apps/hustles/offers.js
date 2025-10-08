import { formatMoney } from '../../../../../core/helpers.js';
import { decorateUrgency } from './urgency.js';

export function createOfferItem(offer = {}, { upcoming = false } = {}) {
  const item = document.createElement('li');
  item.className = 'downwork-offer';
  item.dataset.role = 'downwork-offer';

  if (!offer.ready || upcoming) {
    item.classList.add('is-upcoming');
  }

  decorateUrgency(item, offer.expiresIn);

  const header = document.createElement('div');
  header.className = 'downwork-offer__header';

  const title = document.createElement('span');
  title.className = 'downwork-offer__title';
  title.textContent = offer.label || 'Contract offer';
  header.appendChild(title);

  if (offer.payout) {
    const payout = document.createElement('span');
    payout.className = 'downwork-offer__value';
    payout.textContent = `$${formatMoney(offer.payout)}`;
    header.appendChild(payout);
  }

  item.appendChild(header);

  if (offer.description) {
    const summary = document.createElement('p');
    summary.className = 'downwork-offer__description';
    summary.textContent = offer.description;
    item.appendChild(summary);
  }

  const metaLine = document.createElement('p');
  metaLine.className = 'downwork-offer__meta';
  const details = [];
  if (offer.meta) {
    details.push(offer.meta);
  }
  if (Number.isFinite(offer.expiresIn)) {
    const expiresLabel = offer.expiresIn === 1
      ? 'Expires in 1 day'
      : `Expires in ${offer.expiresIn} days`;
    details.push(expiresLabel);
  }
  if (details.length) {
    metaLine.textContent = details.join(' • ');
    item.appendChild(metaLine);
  }

  const actions = document.createElement('div');
  actions.className = 'downwork-offer__actions';

  const button = document.createElement('button');
  button.type = 'button';

  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked && !upcoming;

  if (ready) {
    button.className = 'downwork-offer__button downwork-offer__button--primary';
    button.textContent = offer.acceptLabel || 'Accept offer';
    button.disabled = false;
    if (typeof offer.onAccept === 'function') {
      button.addEventListener('click', () => {
        offer.onAccept();
      });
    }
  } else {
    button.className = 'downwork-offer__button';
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
    note.className = 'downwork-offer__note';
    note.textContent = offer.unlockHint;
    actions.appendChild(note);
  }

  item.appendChild(actions);

  return item;
}

export function createOfferList(offers = [], { upcoming = false } = {}) {
  const list = document.createElement('ul');
  list.className = 'downwork-offer-list';

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
