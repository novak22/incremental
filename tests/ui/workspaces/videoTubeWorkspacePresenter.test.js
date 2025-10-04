import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { register } from 'node:module';

const loaderUrl = new URL('./helpers/videoTubeStubLoader.js', import.meta.url);
let loaderRegistered = false;

async function ensureLoaderRegistered() {
  if (!loaderRegistered) {
    register(loaderUrl, import.meta.url);
    loaderRegistered = true;
  }
}

test('createVideoTubeWorkspace wires table selection and actions', async t => {
  await ensureLoaderRegistered();

  const qualityCalls = [];
  const renameCalls = [];
  const nicheCalls = [];

  globalThis.__videoTubeStubActive = true;
  globalThis.__videoTubeQualityCalls = qualityCalls;
  globalThis.__videoTubeRenameCalls = renameCalls;
  globalThis.__videoTubeNicheCalls = nicheCalls;

  t.after(() => {
    globalThis.__videoTubeStubActive = false;
    delete globalThis.__videoTubeQualityCalls;
    delete globalThis.__videoTubeRenameCalls;
    delete globalThis.__videoTubeNicheCalls;
  });

  const { createVideoTubeWorkspace } = await import(
    `../../../src/ui/views/browser/components/videotube/createVideoTubeWorkspace.js?stub=${Date.now()}`
  );

  const dom = new JSDOM('<div id="mount"></div>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.HTMLElement;
  });

  const model = {
    definition: { id: 'vlog', label: 'VideoTube' },
    summary: { active: 1 },
    stats: {
      lifetime: 4200,
      daily: 320,
      active: 1,
      milestonePercent: 0.45
    },
    instances: [
      {
        id: 'vid-1',
        label: 'Launch Trailer',
        fallbackLabel: 'Launch Trailer',
        customName: 'Launch Trailer',
        status: { label: 'Active', tone: 'ready' },
        latestPayout: 320,
        lifetimeIncome: 4200,
        qualityLevel: 3,
        milestone: { percent: 0.5, summary: 'Trending on feeds' },
        quickAction: {
          id: 'boost',
          label: 'Boost hype',
          available: true,
          effect: 'Hype surge',
          time: 4,
          cost: 180
        },
        actions: [
          {
            id: 'edit',
            label: 'Polish edit',
            effect: 'Sharpen storytelling',
            time: 2,
            cost: 90,
            available: true
          }
        ],
        nicheLocked: false,
        nicheOptions: [
          { id: 'food', name: 'Foodies', label: 'Hot', summary: 'Hungry fans await' },
          { id: 'tech', name: 'Tech Gurus', label: 'Steady', summary: 'Gadget breakdowns' }
        ]
      },
      {
        id: 'vid-2',
        label: 'Behind the Scenes',
        fallbackLabel: 'Behind the Scenes',
        status: { label: 'In setup', tone: 'pending' },
        latestPayout: 0,
        lifetimeIncome: 0,
        qualityLevel: 1,
        milestone: { percent: 0.1, summary: 'Pre-production' }
      }
    ]
  };

  const presenter = createVideoTubeWorkspace();
  const mount = dom.window.document.getElementById('mount');

  presenter.render(model, { mount });

  const header = mount.querySelector('.videotube__header');
  assert.ok(header, 'workspace header should render');
  assert.match(header.textContent, /VideoTube Studio/, 'expected VideoTube title');

  const navButtons = [...mount.querySelectorAll('.videotube-tab')];
  assert.equal(navButtons.length, 3, 'nav renders dashboard, detail, and analytics views');
  assert.deepEqual(
    navButtons.map(button => button.dataset.view),
    ['dashboard', 'detail', 'analytics'],
    'nav buttons should advertise matching view ids'
  );

  const rows = [...mount.querySelectorAll('.videotube-table tbody tr')];
  assert.equal(rows.length, 2, 'instance table renders each video');
  assert.ok(rows[0].classList.contains('is-selected'), 'first video selected by default');

  const quickActionButton = mount.querySelector('.videotube-table button.videotube-button--ghost');
  assert.ok(quickActionButton, 'quick action button should render in table');
  quickActionButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(qualityCalls.length, 1, 'quick action click triggers quality action');
  assert.deepEqual(qualityCalls[0], ['vlog', 'vid-1', 'boost']);

  presenter.setView('detail');

  const detailView = mount.querySelector('.videotube-view--detail');
  assert.ok(detailView, 'detail view renders after switching tabs');

  const renameForm = detailView.querySelector('.videotube-rename');
  assert.ok(renameForm, 'rename form renders for selected video');
  const renameInput = renameForm.querySelector('input');
  renameInput.value = 'Launch Trailer Deluxe';
  renameForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(renameCalls.length, 1, 'rename form submission triggers asset rename');
  assert.deepEqual(renameCalls[0], ['vlog', 'vid-1', 'Launch Trailer Deluxe']);

  const detailActionButton = detailView.querySelector('.videotube-action button');
  assert.ok(detailActionButton, 'detail quick action button should render');
  detailActionButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(qualityCalls.length, 2, 'detail quick action triggers quality action');
  assert.deepEqual(qualityCalls[1], ['vlog', 'vid-1', 'edit']);

  const nicheSelect = detailView.querySelector('.videotube-select');
  assert.ok(nicheSelect, 'niche select field should render');
  nicheSelect.value = 'tech';
  nicheSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(nicheCalls.length, 1, 'niche selection notifies cards model');
  assert.deepEqual(nicheCalls[0], ['vlog', 'vid-1', 'tech']);
});
