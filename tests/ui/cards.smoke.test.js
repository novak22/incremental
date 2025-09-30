import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

const dom = ensureTestDom();
const { document } = dom.window;

async function setupGameState() {
  const stateModule = await import('../../src/core/state.js');
  const registryModule = await import('../../src/game/registry.js');
  const { configureRegistry, initializeState } = stateModule;
  configureRegistry(registryModule.registry);
  initializeState();
  return registryModule.registry;
}

function ensureElement(id, tag = 'div') {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    document.body.appendChild(node);
  }
  return node;
}

function resetContainer(id) {
  const node = ensureElement(id);
  node.innerHTML = '';
  return node;
}

test('hustle cards render at least one card', async () => {
  const registry = await setupGameState();
  const elements = (await import('../../src/ui/elements.js')).default;
  elements.hustleList = resetContainer('hustle-list');
  const { render } = await import('../../src/ui/cards/hustleCardView.js');
  render(registry.hustles.filter(hustle => hustle.tag?.type !== 'study').slice(0, 1));
  assert.ok(document.querySelector('.hustle-card'), 'expected hustle card to render');
});


test('asset cards render active portfolio', async () => {
  const registry = await setupGameState();
  const gallery = resetContainer('asset-gallery');
  const elements = (await import('../../src/ui/elements.js')).default;
  elements.assetGallery = gallery;
  const { render } = await import('../../src/ui/cards/assetCardView.js');
  render(registry.assets.slice(0, 1));
  assert.ok(document.querySelector('.asset-portfolio'), 'expected asset portfolio to render');
});

function ensureUpgradeUi() {
  const container = ensureElement('panel-upgrades');
  const laneList = ensureElement('upgrade-lane-list', 'ul');
  if (!container.contains(laneList)) {
    container.appendChild(laneList);
  }
  const overview = ensureElement('upgrade-overview');
  if (!container.contains(overview)) {
    container.appendChild(overview);
  }
  overview.innerHTML = '';
  const owned = ensureElement('upgrade-overview-owned', 'span');
  const ready = ensureElement('upgrade-overview-ready', 'span');
  const note = ensureElement('upgrade-overview-note', 'p');
  overview.append(owned, ready, note);
}

test('upgrade cards populate upgrade list', async () => {
  const registry = await setupGameState();
  ensureUpgradeUi();
  const elements = (await import('../../src/ui/elements.js')).default;
  elements.upgradeLaneList = document.getElementById('upgrade-lane-list');
  elements.upgradeList = resetContainer('upgrade-list');
  elements.upgradeDockList = resetContainer('upgrade-dock-list');
  elements.upgradeOverview.container = document.getElementById('upgrade-overview');
  elements.upgradeOverview.purchased = document.getElementById('upgrade-overview-owned');
  elements.upgradeOverview.ready = document.getElementById('upgrade-overview-ready');
  elements.upgradeOverview.note = document.getElementById('upgrade-overview-note');
  const { render } = await import('../../src/ui/cards/upgradeCardView.js');
  render(registry.upgrades.slice(0, 3));
  assert.ok(document.querySelector('.upgrade-card'), 'expected upgrade card to render');
});

test('study cards render track list', async () => {
  const registry = await setupGameState();
  const elements = (await import('../../src/ui/elements.js')).default;
  elements.studyTrackList = resetContainer('study-track-list');
  elements.studyQueueList = resetContainer('study-queue-list');
  elements.studyQueueEta = ensureElement('study-queue-eta', 'span');
  elements.studyQueueCap = ensureElement('study-queue-cap', 'span');
  elements.studyQueueEta.textContent = '';
  elements.studyQueueCap.textContent = '';
  const studyDefs = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const { render } = await import('../../src/ui/cards/studyCardView.js');
  render(studyDefs.slice(0, 1));
  assert.ok(document.querySelector('.study-track'), 'expected study track to render');
});
