import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

const dom = ensureTestDom();
const { document } = dom.window;

test('education tracks reflect canonical study data', async () => {
  const trackList = document.getElementById('study-track-list');
  const queueList = document.getElementById('study-queue-list');
  const queueEta = document.getElementById('study-queue-eta');
  const queueCap = document.getElementById('study-queue-cap');
  assert.ok(trackList, 'study track list should exist in test DOM');
  assert.ok(queueList, 'study queue list should exist in test DOM');
  assert.ok(queueEta, 'study queue ETA should exist in test DOM');
  assert.ok(queueCap, 'study queue cap should exist in test DOM');
  trackList.innerHTML = '';
  queueList.innerHTML = '';
  queueEta.textContent = '';
  queueCap.textContent = '';

  const stateModule = await import('../src/core/state.js');
  const { configureRegistry, initializeState, getState } = stateModule;

  const { registry } = await import('../src/game/registry.js');
  configureRegistry(registry);
  initializeState();

  const requirements = await import('../src/game/requirements.js');
  const progress = requirements.getKnowledgeProgress('outlineMastery', getState());
  progress.enrolled = true;
  progress.daysCompleted = 2;
  progress.studiedToday = false;

  const { renderCardCollections } = await import('../src/ui/cards.js');
  renderCardCollections({
    hustles: [],
    education: registry.hustles.filter(hustle => hustle.tag?.type === 'study'),
    assets: [],
    upgrades: []
  });

  const track = document.querySelector('.study-track');
  assert.ok(track, 'study track should render');

  const countdown = track.querySelector('.study-track__countdown');
  assert.ok(countdown, 'countdown element should exist');
  assert.equal(countdown.textContent, '3 days remaining');

  const metaValues = Array.from(track.querySelectorAll('.study-track__meta dd')).map(node => node.textContent);
  assert.deepEqual(metaValues, ['2h / day', '5 days', '$140']);

  const badges = Array.from(track.querySelectorAll('.study-track__status .badge')).map(node => node.textContent);
  assert.deepEqual(badges, ['Enrolled', 'Study pending']);

  const remaining = track.querySelector('.study-track__remaining');
  assert.equal(remaining?.textContent, '2/5 days complete');

  const remainingDays = track.querySelector('.study-track__remaining-days');
  assert.equal(remainingDays?.textContent, '3 days left');

  const note = track.querySelector('.study-track__note');
  assert.equal(note?.textContent, 'Reserve 2h today to keep momentum humming.');
});
