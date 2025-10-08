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
  item.className = 'downwork-commitment';
  item.dataset.role = 'downwork-commitment';

  const progress = commitment.progress || commitment;
  applyDeadlineTone(item, progress);

  const header = document.createElement('div');
  header.className = 'downwork-commitment__header';

  const title = document.createElement('span');
  title.className = 'downwork-commitment__title';
  title.textContent = commitment.label || 'Commitment';
  header.appendChild(title);

  if (commitment.payoutText) {
    const payout = document.createElement('span');
    payout.className = 'downwork-commitment__value';
    payout.textContent = commitment.payoutText;
    header.appendChild(payout);
  }

  item.appendChild(header);

  if (commitment.description) {
    const summary = document.createElement('p');
    summary.className = 'downwork-commitment__description';
    summary.textContent = commitment.description;
    item.appendChild(summary);
  }

  const metaText = describeCommitmentMeta(commitment);
  if (metaText) {
    const meta = document.createElement('p');
    meta.className = 'downwork-commitment__meta';
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
  list.className = 'downwork-commitment-list';

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
