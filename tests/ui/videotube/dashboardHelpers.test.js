import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { renderQualityCell, renderNicheBadge, renderActionCell } from '../../../src/ui/views/browser/components/videotube/views/dashboard/instanceTable.js';
import { createActionSection } from '../../../src/ui/views/browser/components/videotube/views/dashboard/detailPanel.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;

function getStyleValue(element, property) {
  return element.style.getPropertyValue(property);
}

test('renderQualityCell formats the quality bar from milestone progress', () => {
  const cell = renderQualityCell({
    qualityLevel: 3,
    milestone: { percent: 0.45, summary: 'Almost there!' }
  });

  const level = cell.querySelector('.videotube-quality__level');
  assert.equal(level.textContent, 'Q3');

  const fill = cell.querySelector('.videotube-quality__fill');
  assert.equal(getStyleValue(fill, '--videotube-quality'), '45');

  const summary = cell.querySelector('.videotube-quality__summary');
  assert.equal(summary.textContent, 'Almost there!');
});

test('renderNicheBadge applies tone and tooltips for niche labels', () => {
  const badge = renderNicheBadge({
    niche: {
      name: 'Retro Tech',
      label: 'Energetic',
      summary: 'Viewers crave upbeat gadget breakdowns.'
    }
  });

  assert.equal(badge.textContent, 'Retro Tech');
  assert.equal(badge.dataset.tone, 'energetic');
  assert.equal(badge.title, 'Energetic • Viewers crave upbeat gadget breakdowns.');

  const fallback = renderNicheBadge({});
  assert.equal(fallback.textContent, 'No niche yet');
  assert.equal(fallback.dataset.tone, 'idle');
});

test('quick action helpers wire click handlers to the provided callback', () => {
  let actionCall;
  const video = {
    id: 'vid-42',
    quickAction: {
      id: 'boost',
      label: 'Boost momentum',
      available: true,
      effect: '+25% growth',
      time: 2,
      cost: 400
    }
  };

  const actionCell = renderActionCell(video, {
    formatCurrency: value => `${value} coins`,
    formatHours: value => `${value}h`,
    onQuickAction: (...args) => {
      actionCall = args;
    }
  });

  actionCell.click();
  assert.deepEqual(actionCall, ['vid-42', 'boost']);

  actionCall = undefined;
  const detailSection = createActionSection(video, {
    formatCurrency: value => `${value} coins`,
    formatHours: value => `${value}h`,
    onQuickAction: (...args) => {
      actionCall = args;
    }
  });
  const button = detailSection.querySelector('button');
  button.click();
  assert.deepEqual(actionCall, ['vid-42', 'boost']);
});
