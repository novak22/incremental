import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';
import * as browserCardsPresenter from '../src/ui/views/browser/cardsPresenter.js';
import renderEducationApp from '../src/ui/views/browser/apps/education.js';

const dom = ensureTestDom();
const { document } = dom.window;

function clearLearnlyWorkspace() {
  const learnlyRoot = document.querySelector('[data-browser-page="learnly"] [data-role="learnly-root"]');
  if (learnlyRoot) {
    learnlyRoot.innerHTML = '';
  }
}

async function withEducationRendererOnly(callback) {
  const originalRenderers = [...browserCardsPresenter.APP_RENDERERS];
  browserCardsPresenter.APP_RENDERERS.length = 0;
  browserCardsPresenter.APP_RENDERERS.push((context, registries = {}, models = {}) =>
    renderEducationApp(context, registries.education || [], models.education || {})
  );
  try {
    await callback();
  } finally {
    browserCardsPresenter.APP_RENDERERS.length = 0;
    originalRenderers.forEach(renderer => {
      browserCardsPresenter.APP_RENDERERS.push(renderer);
    });
  }
}

test('renderCardCollections hydrates Learnly workspace when models are omitted', async t => {
  clearLearnlyWorkspace();

  const stateModule = await import('../src/core/state.js');
  const registryService = await import('../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');
  const { initializeState } = stateModule;

  registryService.resetRegistry();
  t.after(() => {
    registryService.resetRegistry();
  });

  const registry = ensureRegistryReady();
  initializeState();

  const educationDefinitions = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const { renderCardCollections } = await import('../src/ui/cards.js');
  await withEducationRendererOnly(async () => {
    renderCardCollections({
      hustles: [],
      education: educationDefinitions,
      assets: [],
      upgrades: []
    });
  });

  const workspaceHost = document.getElementById('browser-workspaces');
  const learnlyRoot = workspaceHost?.querySelector('[data-browser-page="learnly"] [data-role="learnly-root"]');
  assert.ok(learnlyRoot, 'expected Learnly root to render inside the browser workspace host');

  const courseCards = learnlyRoot.querySelectorAll('.learnly-card');
  assert.ok(courseCards.length > 0, 'expected Learnly catalog to show course cards when models are synthesized');
});

test('education tracks reflect canonical study data', async () => {
  clearLearnlyWorkspace();

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
  const { buildEducationModels } = await import('../src/ui/cards/model/index.js');
  const educationModels = buildEducationModels(educationDefinitions);
  const { renderCardCollections } = await import('../src/ui/cards.js');
  await withEducationRendererOnly(async () => {
    renderCardCollections(
      {
        hustles: [],
        education: educationDefinitions,
        assets: [],
        upgrades: []
      },
      { education: educationModels }
    );
  });

  const workspaceHost = document.getElementById('browser-workspaces');
  const learnlyRoot = workspaceHost?.querySelector('[data-browser-page="learnly"] [data-role="learnly-root"]');
  assert.ok(learnlyRoot, 'expected Learnly workspace to render for education content');

  const courseCard = learnlyRoot.querySelector('[data-course-id="outlineMastery"]');
  assert.ok(courseCard, 'expected Outline Mastery course card to be visible');

  const statsValues = Array.from(courseCard.querySelectorAll('.learnly-card__stats dd')).map(node => node.textContent);
  assert.deepEqual(statsValues, ['$140', '2h / day', '5 days']);

  const progressLabel = courseCard.querySelector('.learnly-progress__label');
  assert.equal(progressLabel?.textContent, '2/5 days • 3 left');

  const progressFill = courseCard.querySelector('.learnly-progress__bar span');
  assert.equal(progressFill?.style.width, '40%');

  const badges = Array.from(courseCard.querySelectorAll('.learnly-badge')).map(node => node.textContent);
  assert.ok(badges.includes('Writing & Storycraft'), 'expected Writing & Storycraft category badge');

  const primaryButton = courseCard.querySelector('.learnly-button--primary');
  assert.equal(primaryButton?.textContent, 'Continue');
});

test('completed study tracks celebrate progress and skills', async () => {
  clearLearnlyWorkspace();

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
  const { buildEducationModels } = await import('../src/ui/cards/model/index.js');
  const { renderCardCollections, updateAllCards } = await import('../src/ui/cards.js');

  const initialModels = buildEducationModels(educationDefinitions);
  await withEducationRendererOnly(async () => {
    renderCardCollections(
      {
        hustles: [],
        education: educationDefinitions,
        assets: [],
        upgrades: []
      },
      { education: initialModels }
    );
  });

  const state = getState();
  const progress = getKnowledgeProgress('outlineMastery', state);
  progress.daysCompleted = progress.totalDays;
  progress.completed = true;
  progress.enrolled = false;
  progress.studiedToday = false;

  const updatedModels = buildEducationModels(educationDefinitions);
  await withEducationRendererOnly(async () => {
    updateAllCards(
      {
        hustles: [],
        education: educationDefinitions,
        assets: [],
        upgrades: []
      },
      { education: updatedModels }
    );
  });

  const workspaceHost = document.getElementById('browser-workspaces');
  const learnlyRoot = workspaceHost?.querySelector('[data-browser-page="learnly"] [data-role="learnly-root"]');
  assert.ok(learnlyRoot, 'expected Learnly workspace to remain mounted after updates');

  const tabButtons = Array.from(learnlyRoot?.querySelectorAll('.learnly-tab') || []);
  const myCoursesTab = tabButtons.find(button => /My Courses/i.test(button?.textContent || ''));
  assert.ok(myCoursesTab, 'expected My Courses tab to exist');
  myCoursesTab?.click();

  const myCoursesView = learnlyRoot?.querySelector('.learnly-view--my-courses');
  assert.ok(myCoursesView, 'expected My Courses view to render');

  const enrollmentCards = Array.from(myCoursesView?.querySelectorAll('.learnly-enrollment') || []);
  const enrollmentCard = enrollmentCards.find(card =>
    card.querySelector('h3')?.textContent?.includes('Outline Mastery')
  );
  assert.ok(enrollmentCard, 'expected completed course to appear in My Courses view');

  const enrollmentStatus = enrollmentCard?.querySelector('.learnly-enrollment__status');
  assert.equal(enrollmentStatus?.textContent, 'Completed');

  const enrollmentProgress = enrollmentCard?.querySelector('.learnly-progress__bar span');
  assert.equal(enrollmentProgress?.style.width, '100%');

  const reviewButton = enrollmentCard?.querySelector('.learnly-button--primary');
  assert.ok(reviewButton, 'expected review button to be available');
  reviewButton?.click();

  const detailView = learnlyRoot?.querySelector('.learnly-view--detail');
  assert.ok(detailView, 'expected clicking a course to open the detail view');

  const detailProgress = detailView?.querySelector('.learnly-progress__label');
  assert.equal(detailProgress?.textContent, 'Completed');

  const highlightValues = Array.from(detailView?.querySelectorAll('.learnly-highlight__value') || []).map(
    node => node.textContent
  );
  assert.deepEqual(highlightValues, ['$140', '2h per day', '5 days']);

  const rewardsBody = detailView?.querySelector('.learnly-detail__section:last-of-type p');
  assert.equal(
    rewardsBody?.textContent,
    'Finish the full 5 days to earn +120 XP across Writing & Storycraft (100%).',
    'expected rewards note to celebrate XP gains'
  );

  const detailCta = detailView?.querySelector('.learnly-button--primary');
  assert.equal(detailCta?.textContent, 'Course complete');
  assert.equal(detailCta?.disabled, true);
});
