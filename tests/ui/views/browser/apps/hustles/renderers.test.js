import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { createOfferItem, createOfferList } from '../../../../../../src/ui/views/browser/apps/hustles/offers.js';
import {
  createCommitmentItem,
  createCommitmentList,
  describeCommitmentMeta
} from '../../../../../../src/ui/views/browser/apps/hustles/commitments.js';
import { decorateUrgency } from '../../../../../../src/ui/views/browser/apps/hustles/urgency.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

test('createOfferItem renders ready offers with accept CTA and urgency classes', () => {
  const dom = setupDom();
  try {
    let accepted = false;
    const item = createOfferItem({
      label: 'Priority logo sprint',
      description: 'Open now',
      payout: 120,
      ready: true,
      expiresIn: 1,
      onAccept: () => {
        accepted = true;
      }
    });

    document.body.appendChild(item);

    assert.equal(item.classList.contains('is-upcoming'), false);
    assert.equal(item.classList.contains('is-critical'), true, 'expected urgent styling for near expiry offers');

    const button = item.querySelector('button');
    assert.ok(button, 'expected accept button to render');
    assert.equal(button.classList.contains('browser-card__button--primary'), true);
    assert.equal(button.disabled, false);

    button.click();
    assert.equal(accepted, true, 'expected onAccept handler to run when button clicked');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('createOfferList builds upcoming entries with lock hints', () => {
  const dom = setupDom();
  try {
    const list = createOfferList([
      {
        label: 'Locked hustle',
        ready: false,
        locked: true,
        unlockHint: 'Complete the tutorial',
        expiresIn: 4
      }
    ], { upcoming: true });

    document.body.appendChild(list);

    const item = list.querySelector('.hustle-card__offer');
    assert.ok(item, 'expected list item to render');
    assert.equal(item.classList.contains('is-upcoming'), true);
    assert.equal(item.classList.contains('is-warning'), false, 'no urgency tone for distant expiry');

    const button = item.querySelector('button');
    assert.ok(button);
    assert.equal(button.disabled, true, 'locked offers should be disabled');
    assert.equal(button.textContent, 'Locked');
    assert.equal(button.title, 'Complete the tutorial');

    const note = list.querySelector('.browser-card__note');
    assert.equal(note?.textContent, 'Complete the tutorial');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('createCommitmentItem surfaces meta and timeline progress', () => {
  const dom = setupDom();
  try {
    const commitment = {
      label: 'Finish quarterly report',
      description: 'Focus through the due date.',
      payoutText: '$240 contract',
      meta: 'Log 6h of design',
      progress: {
        daysRequired: 3,
        remainingDays: 1,
        hoursLogged: 4,
        hoursRequired: 6
      }
    };

    const item = createCommitmentItem(commitment);
    document.body.appendChild(item);

    assert.equal(item.classList.contains('is-critical'), true, 'deadline tone should mark near-due commitments');

    const meta = item.querySelector('.hustle-card__meta');
    assert.ok(meta, 'expected commitment meta summary');
    assert.ok(meta.textContent.includes('3-day commitment'));
    assert.ok(meta.textContent.includes('Due today'));

    const timeline = item.querySelector('.commitment-timeline');
    assert.ok(timeline, 'expected commitment timeline to render');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('describeCommitmentMeta merges payout, copy, and deadlines', () => {
  const summary = describeCommitmentMeta({
    meta: 'Design review',
    payoutText: '$120 bonus',
    progress: { daysRequired: 2, remainingDays: 0 }
  });

  assert.ok(summary.includes('Design review'));
  assert.ok(summary.includes('$120 bonus'));
  assert.ok(summary.includes('2-day commitment'));
  assert.ok(summary.includes('Due today'));
});

test('decorateUrgency toggles severity classes based on remaining days', () => {
  const dom = setupDom();
  try {
    const item = document.createElement('div');
    decorateUrgency(item, 2);
    assert.equal(item.classList.contains('is-warning'), true);
    assert.equal(item.classList.contains('is-critical'), false);

    decorateUrgency(item, 0);
    assert.equal(item.classList.contains('is-critical'), true);
    assert.equal(item.classList.contains('is-warning'), false);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('createCommitmentList and createOfferList ignore null entries', () => {
  const dom = setupDom();
  try {
    const commitments = createCommitmentList([null, { label: 'Valid', progress: {} }]);
    const offers = createOfferList([null, { label: 'Accept me', ready: true }]);

    assert.equal(commitments.children.length, 1);
    assert.equal(offers.children.length, 1);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
