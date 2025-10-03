import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

const dom = ensureTestDom();
const { document } = dom.window;

async function prepareEducationData() {
  const stateModule = await import('../src/core/state.js');
  const registryService = await import('../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');
  const cardCollectionServiceModule = await import('../src/ui/cards/collectionService.js');
  const cardCollectionService = cardCollectionServiceModule.default;

  registryService.resetRegistry();
  ensureRegistryReady();
  stateModule.initializeState();

  cardCollectionService.refreshCollections({ registries: true });
  const { registries, models } = cardCollectionService.getCollections();
  return { registries, models, stateModule, cardCollectionService };
}

test('learnly catalog renders course cards for study tracks', async () => {
  const { registries, models } = await prepareEducationData();
  const learnlyApp = await import('../src/ui/views/browser/components/learnly.js');

  const mount = document.createElement('div');
  mount.dataset.role = 'learnly-root';
  document.body.appendChild(mount);

  learnlyApp.default.render(models.education, {
    mount,
    page: { id: 'education', slug: 'education' },
    definitions: registries.education,
    onRouteChange: () => {}
  });

  const catalogCards = mount.querySelectorAll('.learnly-card');
  assert.ok(catalogCards.length > 0, 'expected learnly catalog to render course cards');
});

test('learnly enrollment view highlights active study progress', async () => {
  const { registries, stateModule, cardCollectionService } = await prepareEducationData();
  const learnlyApp = await import('../src/ui/views/browser/components/learnly.js');
  const requirements = await import('../src/game/requirements.js');

  const state = stateModule.getState();
  const track = requirements.getKnowledgeProgress('outlineMastery', state);
  track.enrolled = true;
  track.daysCompleted = 3;
  track.totalDays = 5;
  track.completed = false;
  track.studiedToday = false;

  cardCollectionService.refreshCollections();
  const { models } = cardCollectionService.getCollections();

  const mount = document.createElement('div');
  mount.dataset.role = 'learnly-root';
  document.body.appendChild(mount);

  learnlyApp.default.render(models.education, {
    mount,
    page: { id: 'education', slug: 'education' },
    definitions: registries.education,
    onRouteChange: () => {}
  });

  const myCoursesTab = Array.from(mount.querySelectorAll('.learnly-tab')).find(button =>
    button.textContent.toLowerCase().includes('my courses')
  );
  assert.ok(myCoursesTab, 'expected My Courses tab control');
  myCoursesTab.click();

  const enrollmentCard = mount.querySelector('.learnly-enrollment');
  assert.ok(enrollmentCard, 'expected enrollment card to render');
  const status = enrollmentCard.querySelector('.learnly-enrollment__status');
  assert.ok(status?.textContent?.toLowerCase().includes('study pending'));
});
