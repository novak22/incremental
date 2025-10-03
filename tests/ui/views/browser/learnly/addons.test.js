import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import learnlyApp from '../../../../../src/ui/views/browser/components/learnly.js';

function setupDom() {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

test('Learnly boosters render add-ons with purchase states', async t => {
  const dom = setupDom();
  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  const mount = document.getElementById('root');
  const clickSpy = { count: 0 };

  const model = {
    tracks: [],
    addons: [
      {
        id: 'automationCourse',
        name: 'Automation Course',
        description: 'Boost blog payouts by automating repetitive publishing.',
        cost: 260,
        tag: { label: 'Boost', type: 'boost' },
        snapshot: {
          cost: 260,
          affordable: true,
          disabled: false,
          purchased: false,
          ready: true
        },
        action: {
          label: 'Study Up',
          disabled: false,
          onClick: () => {
            clickSpy.count += 1;
          }
        }
      },
      {
        id: 'ownedBooster',
        name: 'Owned Booster',
        description: 'Already active add-on.',
        cost: 0,
        snapshot: {
          cost: 0,
          affordable: true,
          disabled: false,
          purchased: true,
          ready: false
        },
        action: {
          label: 'Owned',
          disabled: true,
          onClick: () => {
            throw new Error('owned booster should not invoke action');
          }
        }
      }
    ],
    queue: { entries: [], totalHours: 0, totalLabel: '', capHours: 0, capLabel: '' }
  };

  learnlyApp.render(model, { mount, page: { id: 'learnly' }, definitions: [], onRouteChange: () => {} });

  const boosterTab = Array.from(mount.querySelectorAll('.learnly-tab')).find(button =>
    button.textContent.includes('Boosters')
  );
  assert.ok(boosterTab, 'expected Boosters tab to render');
  boosterTab.click();

  const addonCards = mount.querySelectorAll('.learnly-card--addon');
  assert.equal(addonCards.length, 2, 'expected two booster cards to render');

  const [readyCard, ownedCard] = addonCards;
  const readyStatus = readyCard.querySelectorAll('.learnly-card__stats dd')[1]?.textContent;
  assert.equal(readyStatus, 'Ready to launch', 'ready booster should announce readiness');

  const purchaseButton = readyCard.querySelector('.learnly-button');
  assert.ok(purchaseButton, 'ready booster should have a purchase button');
  assert.equal(purchaseButton.disabled, false, 'ready booster button should be enabled');
  purchaseButton.click();
  assert.equal(clickSpy.count, 1, 'purchase handler should run when clicking ready booster');

  const ownedStatus = ownedCard.querySelectorAll('.learnly-card__stats dd')[1]?.textContent;
  assert.equal(ownedStatus, 'Owned and active', 'owned booster should display owned status');

  const ownedButton = ownedCard.querySelector('.learnly-button');
  assert.ok(ownedButton, 'owned booster should render button');
  assert.equal(ownedButton.disabled, true, 'owned booster button should be disabled');
  assert.match(ownedButton.textContent, /Owned/i, 'owned booster button should read Owned');
});
