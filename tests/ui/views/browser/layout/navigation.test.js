import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationController } from '../../../../../src/ui/views/browser/layout/navigation.js';

const HOMEPAGE_ID = 'home';

function createStubEvent() {
  return {
    preventDefault() {}
  };
}

test('navigation controller tracks history and back/forward flows', () => {
  const controller = createNavigationController({ homepageId: HOMEPAGE_ID });

  assert.equal(controller.getCurrentPage(), HOMEPAGE_ID);

  controller.handleNavigation('alpha');
  controller.handleNavigation('beta');

  let target = null;
  controller.navigateBack(pageId => {
    target = pageId;
  });
  assert.equal(target, 'alpha', 'back should yield previous page');
  controller.handleNavigation(target, { recordHistory: false });
  assert.equal(controller.getCurrentPage(), 'alpha');

  target = null;
  controller.navigateBack(pageId => {
    target = pageId;
  });
  assert.equal(target, HOMEPAGE_ID, 'back reaches homepage');
  controller.handleNavigation(target, { recordHistory: false });
  assert.equal(controller.getCurrentPage(), HOMEPAGE_ID);

  target = null;
  controller.navigateForward(pageId => {
    target = pageId;
  });
  assert.equal(target, 'alpha', 'forward returns to last visited page');
  controller.handleNavigation(target, { recordHistory: false });
  assert.equal(controller.getCurrentPage(), 'alpha');

  controller.handleNavigation('gamma');
  controller.purge('alpha');
  controller.navigateBack(pageId => {
    target = pageId;
  });
  assert.equal(target, HOMEPAGE_ID, 'purged page is removed from history');
});

test('address handler parses urls and resets to current page', () => {
  const controller = createNavigationController({ homepageId: HOMEPAGE_ID });
  const calls = [];
  const captured = [];
  const handler = controller.createAddressSubmitHandler({
    getValue: () => captured.at(-1) ?? 'https://alpha.hub/quests',
    setValue: value => {
      captured.push(value);
    },
    onNavigate: pageId => {
      calls.push(pageId);
    },
    findPageById: id => (id === HOMEPAGE_ID ? { id: HOMEPAGE_ID } : null),
    findPageBySlug: slug => (slug === 'alpha' ? { id: 'alpha', slug } : null),
    formatAddress: page => `formatted:${page.id}`
  });

  handler(createStubEvent());
  assert.deepEqual(calls, ['alpha'], 'slug navigation invokes callback');

  captured.push('https://unknown.example.com/path');
  handler(createStubEvent());
  assert.equal(
    captured.at(-1),
    'formatted:home',
    'invalid addresses reset to the current workspace URL'
  );
});
