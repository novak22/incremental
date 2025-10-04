import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { mapHeroSnapshot, renderHero } from '../../../../../../src/ui/views/browser/components/aboutyou/hero.js';
import { createSkillCard } from '../../../../../../src/ui/views/browser/components/aboutyou/skillsSection.js';
import { createEquipmentCard } from '../../../../../../src/ui/views/browser/components/aboutyou/equipmentSection.js';
import { buildMetricEntries } from '../../../../../../src/ui/views/browser/components/aboutyou/metricsSection.js';
import { computeAssetHighlights } from '../../../../../../src/ui/views/browser/components/aboutyou/assetsSection.js';

function withDom(callback) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const { document } = dom.window;
  const previousDocument = globalThis.document;
  globalThis.document = document;
  try {
    callback({ dom, document });
  } finally {
    if (previousDocument) {
      globalThis.document = previousDocument;
    } else {
      delete globalThis.document;
    }
    dom.window.close();
  }
}

test('mapHeroSnapshot falls back to friendly defaults', () => {
  const items = mapHeroSnapshot({});
  assert.equal(items.length, 5, 'expected five snapshot metrics');
  const byId = Object.fromEntries(items.map(item => [item.id, item]));
  assert.equal(byId.netWorth.value, '$0');
  assert.equal(byId.currentDay.value, 'Day 1');
  assert.equal(byId.hoursLeft.value, '0h');
});

test('renderHero delegates stats to renderKpiGrid with themed classes', () => {
  withDom(() => {
    const summary = { formatted: { current: '$100', earned: '$200', spent: '$50', day: 'Day 3', time: '3h' } };
    const mount = document.createElement('div');
    let receivedOptions = null;
    const renderStats = options => {
      receivedOptions = options;
      const section = document.createElement('section');
      section.className = 'stub-snapshot';
      return section;
    };

    renderHero({ summary }, mount, { renderStats });

    assert.ok(receivedOptions, 'expected stats renderer to be invoked');
    assert.equal(receivedOptions.theme.card, 'aboutyou-hero__stat');
    assert.equal(receivedOptions.items.length, 5);
    assert.ok(mount.querySelector('.stub-snapshot'), 'snapshot should be appended to mount');
  });
});

test('createSkillCard highlights mastered skills with milestone badge', () => {
  withDom(() => {
    const card = createSkillCard({
      name: 'Storycraft',
      level: 7,
      xp: '7,500',
      remainingXp: '0',
      tierTitle: 'Legendary Scribe',
      isMaxed: true,
      progressPercent: 100
    });

    assert.ok(card.classList.contains('is-maxed'));
    const badge = card.querySelector('.aboutyou-badge--success');
    assert.ok(badge, 'expected success badge when maxed');
    assert.match(badge.textContent, /Milestone achieved/);
  });
});

test('createEquipmentCard renders purchase cost when provided', () => {
  withDom(() => {
    const card = createEquipmentCard({
      name: 'Creator Rig',
      status: 'Active',
      summary: 'Custom video editing battlestation',
      focus: 'Video Production',
      cost: 4500
    });

    const note = card.querySelector('.aboutyou-card__note--cost');
    assert.ok(note, 'expected cost note to render');
    assert.match(note.textContent, /Purchased for/);
  });
});

test('buildMetricEntries summarises earnings and highlights top asset', () => {
  const highlights = [{ name: 'Creator Collective', lifetime: 7500, lastPayout: 500 }];
  const entries = buildMetricEntries(
    { formatted: { earned: '$10,000', spent: '$3,000' } },
    { metrics: { history: [] }, baseTime: 8, day: 2, timeLeft: 5 },
    { totalEarnings: 1200, totalSpend: 300 },
    highlights
  );

  const byLabel = Object.fromEntries(entries.map(item => [item.label, item]));
  assert.equal(byLabel['Lifetime earned'].value, '$10,000');
  assert.match(byLabel['Daily net flow'].value, /\+/);
  assert.match(byLabel['Top earning asset'].meta, /last payout/);
});

test('computeAssetHighlights returns the richest three assets ordered by income', () => {
  const model = {
    groups: [
      {
        definitions: [{ id: 'studio', name: 'Studio' }],
        instances: [
          { index: 0, status: 'active', instance: { id: 'studio-1', totalIncome: 1500, lastIncome: 400, nicheId: 'video' } },
          { index: 1, status: 'setup', instance: { id: 'studio-2', totalIncome: 4500, lastIncome: 0, nicheId: 'audio' } },
          { index: 2, status: 'active', instance: { id: 'studio-3', totalIncome: 9500, lastIncome: 1000, nicheId: 'video' } }
        ]
      }
    ]
  };

  const highlights = computeAssetHighlights(model);
  assert.equal(highlights.length, 3);
  assert.equal(highlights[0].id, 'studio-3', 'highest lifetime income first');
  assert.equal(highlights[1].id, 'studio-2');
  assert.equal(highlights[2].id, 'studio-1');
});
