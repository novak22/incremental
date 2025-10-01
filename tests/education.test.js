import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

const dom = ensureTestDom();
const { document } = dom.window;

test('renderCardCollections synthesizes models when omitted', async () => {
  const hustleList = document.getElementById('hustle-list');
  const ventureGallery = document.getElementById('venture-gallery');
  hustleList.innerHTML = '';
  if (ventureGallery) {
    ventureGallery.innerHTML = '';
  }

  const stateModule = await import('../src/core/state.js');
  const registryService = await import('../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');
  const { initializeState } = stateModule;

  registryService.resetRegistry();
  const registry = ensureRegistryReady();
  initializeState();

  const viewManager = await import('../src/ui/viewManager.js');
  const classicModule = await import('../src/ui/views/classic/index.js');
  const fallbackView = {
    ...classicModule.default,
    presenters: { ...classicModule.default.presenters, cards: null }
  };
  viewManager.setActiveView(fallbackView, document);

  const { renderCardCollections } = await import('../src/ui/cards.js');
  try {
    renderCardCollections({
      hustles: registry.hustles.filter(hustle => hustle.tag?.type !== 'study').slice(0, 3),
      education: [],
      assets: registry.assets.slice(0, 2),
      upgrades: []
    });

    const hustleCards = document.querySelectorAll('.hustle-card');
    const assetCards = document.querySelectorAll('#venture-gallery [data-asset]');
    assert.ok(
      hustleCards.length > 0 || assetCards.length > 0,
      'fallback render should show hustles or ventures without provided models'
    );
  } finally {
    viewManager.setActiveView(classicModule.default, document);
  }
});

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
  const { initializeState, getState } = stateModule;

  const registryService = await import('../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');
  registryService.resetRegistry();
  const registry = ensureRegistryReady();
  initializeState();

  const requirements = await import('../src/game/requirements.js');
  const progress = requirements.getKnowledgeProgress('outlineMastery', getState());
  progress.enrolled = true;
  progress.daysCompleted = 2;
  progress.studiedToday = false;

  const educationDefinitions = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const { buildEducationModels } = await import('../src/ui/cards/model.js');
  const educationModels = buildEducationModels(educationDefinitions);
  const { renderCardCollections } = await import('../src/ui/cards.js');
  renderCardCollections(
    {
      hustles: [],
      education: educationDefinitions,
      assets: [],
      upgrades: []
    },
    { education: educationModels }
  );

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

test('completed study tracks celebrate progress and skills', async () => {
  const trackList = document.getElementById('study-track-list');
  const queueList = document.getElementById('study-queue-list');
  const queueEta = document.getElementById('study-queue-eta');
  const queueCap = document.getElementById('study-queue-cap');
  trackList.innerHTML = '';
  queueList.innerHTML = '';
  queueEta.textContent = '';
  queueCap.textContent = '';

  const stateModule = await import('../src/core/state.js');
  const { initializeState, getState } = stateModule;

  const registryService = await import('../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');
  registryService.resetRegistry();
  const registry = ensureRegistryReady();
  initializeState();

  const requirements = await import('../src/game/requirements.js');
  const { getKnowledgeProgress } = requirements;

  const educationDefinitions = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const { buildEducationModels } = await import('../src/ui/cards/model.js');
  const { renderCardCollections, updateAllCards } = await import('../src/ui/cards.js');
  const initialModels = buildEducationModels(educationDefinitions);
  renderCardCollections(
    {
      hustles: [],
      education: educationDefinitions,
      assets: [],
      upgrades: []
    },
    { education: initialModels }
  );

  const state = getState();
  const progress = getKnowledgeProgress('outlineMastery', state);
  progress.daysCompleted = progress.totalDays;
  progress.completed = true;
  progress.enrolled = false;
  progress.studiedToday = false;

  const updatedModels = buildEducationModels(educationDefinitions);
  updateAllCards(
    {
      hustles: [],
      education: educationDefinitions,
      assets: [],
      upgrades: []
    },
    { education: updatedModels }
  );

  const track = document.querySelector("[data-track='outlineMastery']");
  assert.ok(track, 'study track should remain visible after completion');
  assert.equal(track?.dataset.complete, 'true');

  const fill = track?.querySelector('.study-track__progress span');
  assert.equal(fill?.style.width, '100%');

  const remaining = track?.querySelector('.study-track__remaining');
  assert.equal(remaining?.textContent, '5/5 days complete');

  const remainingDays = track?.querySelector('.study-track__remaining-days');
  assert.equal(remainingDays?.textContent, 'Course complete');

  const skillHeading = track?.querySelector('.study-track__skills-heading');
  assert.equal(skillHeading?.textContent, 'Skill rewards');

  const skillItems = Array.from(track?.querySelectorAll('.study-track__skills-item strong') || []).map(
    node => node.textContent
  );
  assert.ok(
    skillItems.includes('Writing & Storycraft'),
    'skill rewards should list Writing & Storycraft focus'
  );

  const xpNote = track?.querySelector('.study-track__skills-note');
  assert.equal(xpNote?.textContent, 'Graduates collect +120 XP across these disciplines.');
});

test('expanded curriculum registers new boosts and passive multipliers', async () => {
  const { KNOWLEDGE_TRACKS, KNOWLEDGE_REWARDS } = await import('../src/game/requirements.js');
  assert.ok(KNOWLEDGE_TRACKS.curriculumDesignStudio, 'curriculum design studio track should exist');
  assert.ok(KNOWLEDGE_TRACKS.postProductionPipelineLab, 'post-production lab track should exist');
  assert.equal(
    KNOWLEDGE_REWARDS.galleryLicensingSummit.baseXp,
    140,
    'gallery licensing summit should award 140 base XP'
  );
  const fulfillmentBoost = KNOWLEDGE_TRACKS.fulfillmentOpsMasterclass.instantBoosts.find(
    boost => boost.assetId === 'dropshipping'
  );
  assert.ok(fulfillmentBoost, 'fulfillment masterclass should reference dropshipping asset');
  const syndicationBoost = KNOWLEDGE_TRACKS.syndicationResidency.instantBoosts.find(
    boost => boost.assetId === 'blog'
  );
  assert.ok(syndicationBoost, 'syndication residency should reference blog asset');

  const { getAssetEducationBonuses } = await import('../src/game/educationEffects.js');
  const dropshipBonuses = getAssetEducationBonuses('dropshipping');
  assert.ok(
    dropshipBonuses.some(boost => boost.trackId === 'fulfillmentOpsMasterclass'),
    'dropshipping asset should receive fulfillment ops masterclass boosts'
  );
  const vlogBonuses = getAssetEducationBonuses('vlog');
  assert.ok(
    vlogBonuses.some(boost => boost.trackId === 'postProductionPipelineLab'),
    'vlog asset should receive post-production lab boosts'
  );
});
