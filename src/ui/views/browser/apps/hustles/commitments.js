import {
  createCommitmentTimeline,
  applyDeadlineTone,
  describeDeadlineLabel
} from '../../components/commitmentMeters.js';

export function describeCommitmentMeta(commitment = {}) {
  const parts = [];

  if (commitment.meta) {
    parts.push(commitment.meta);
  }

  if (commitment.payoutText) {
    parts.push(commitment.payoutText);
  }

  const progress = commitment.progress || commitment;
  const daysRequired = progress?.daysRequired ?? commitment.daysRequired;
  if (Number.isFinite(daysRequired) && daysRequired > 0) {
    parts.push(`${daysRequired}-day commitment`);
  }

  if (progress?.remainingDays != null) {
    parts.push(describeDeadlineLabel(progress));
  }

  return parts.filter(Boolean).join(' • ');
}

export function createCommitmentItem(commitment = {}) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__commitment downwork-marketplace__offer';

  const progress = commitment.progress || commitment;
  applyDeadlineTone(item, progress);

  const header = document.createElement('div');
  header.className = 'hustle-card__row';

  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = commitment.label || 'Commitment';
  header.appendChild(title);

  if (commitment.payoutText) {
    const payout = document.createElement('span');
    payout.className = 'hustle-card__value';
    payout.textContent = commitment.payoutText;
    header.appendChild(payout);
  }

  item.appendChild(header);

  if (commitment.description) {
    const summary = document.createElement('p');
    summary.className = 'hustle-card__description';
    summary.textContent = commitment.description;
    item.appendChild(summary);
  }

  const metaText = describeCommitmentMeta(commitment);
  if (metaText) {
    const meta = document.createElement('p');
    meta.className = 'hustle-card__meta';
    meta.textContent = metaText;
    item.appendChild(meta);
  }

  const timeline = createCommitmentTimeline(progress);
  if (timeline) {
    item.appendChild(timeline);
  }

  return item;
}

export function createCommitmentList(commitments = []) {
  const list = document.createElement('ul');
  list.className = 'browser-card__list downwork-marketplace__offer-list';

  commitments.filter(Boolean).forEach(commitment => {
    const item = createCommitmentItem(commitment);
    list.appendChild(item);
  });

  return list;
}

export default {
  describeCommitmentMeta,
  createCommitmentItem,
  createCommitmentList
};
