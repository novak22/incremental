import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createAssetWorkspacePresenter } from '../../../src/ui/views/browser/utils/createAssetWorkspace.js';

function ensureArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

test('createAssetWorkspacePresenter composes workspace UI from declarative config', async t => {
  const dom = new JSDOM('<div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  const mount = dom.window.document.getElementById('root');
  const launchEvents = [];

  const DETAIL_BY_ID = {
    alpha: {
      payout: '$120',
      upkeep: '$30',
      roi: '120%',
      summary: 'Alpha app is cruising with daily subscribers.',
      notes: ['Strong retention', 'Upgrades unlocked']
    },
    beta: {
      payout: '$0',
      upkeep: '$12',
      roi: '0%',
      summary: 'Beta app is prepping for launch.',
      notes: ['Assign niche soon', 'Queue marketing drip']
    }
  };

  const model = {
    summary: {
      meta: 'Launchpad humming',
      hero: [
        { id: 'active', label: 'Active apps', value: 1, note: 'Live today' },
        { id: 'setup', label: 'In setup', value: 1 }
      ]
    },
    instances: [
      { id: 'alpha', label: 'Alpha App', status: { label: 'Active', tone: 'ready' }, payout: 120 },
      { id: 'beta', label: 'Beta App', status: { label: 'Setup', tone: 'pending' }, payout: 0 }
    ]
  };

  const presenter = createAssetWorkspacePresenter({
    className: 'sample-workspace',
    defaultView: 'overview',
    state: { view: 'overview', selectedId: null },
    ensureSelection(state, currentModel) {
      if (!state.selectedId) {
        const first = ensureArray(currentModel.instances)[0];
        state.selectedId = first?.id ?? null;
      }
    },
    header(modelSnapshot) {
      return {
        className: 'sample-header',
        title: 'Sample Asset Console',
        subtitle: modelSnapshot.summary?.meta,
        actions: [
          {
            label: 'Launch asset',
            className: 'sample-header__action',
            dataset: { testid: 'launch-action' },
            onClick: () => launchEvents.push('launch')
          }
        ],
        nav: {
          navClassName: 'sample-tabs',
          buttonClassName: 'sample-tab'
        }
      };
    },
    views: [
      {
        id: 'overview',
        label: 'Overview',
        render({ model: renderModel, state, renderKpiGrid, renderInstanceTable, renderDetailPanel, updateState }) {
          const section = document.createElement('section');
          section.className = 'overview-view';

          const selected = ensureArray(renderModel.instances).find(entry => entry.id === state.selectedId) || null;
          const detail = selected ? DETAIL_BY_ID[selected.id] : null;

          section.append(
            renderKpiGrid({
              className: 'sample-kpis',
              items: ensureArray(renderModel.summary?.hero).map(item => ({
                id: item.id,
                label: item.label,
                value: item.value,
                note: item.note
              }))
            }),
            renderInstanceTable({
              className: 'sample-table',
              columns: [
                { id: 'name', label: 'App' },
                { id: 'status', label: 'Status' },
                { id: 'payout', label: 'Daily payout' }
              ],
              rows: ensureArray(renderModel.instances).map(instance => ({
                id: instance.id,
                cells: [
                  instance.label,
                  instance.status?.label || '',
                  `$${instance.payout}`
                ]
              })),
              selectedId: state.selectedId,
              onSelect: rowId => updateState(current => ({ ...current, selectedId: rowId }))
            }),
            renderDetailPanel({
              className: 'sample-detail',
              isEmpty: !selected,
              emptyState: {
                title: 'Pick an instance',
                message: 'Choose an instance to inspect payout trends.'
              },
              header: selected && {
                title: selected.label,
                status: { label: selected.status?.label || '', tone: selected.status?.tone }
              },
              stats: detail
                ? [
                    { label: 'Payout', value: detail.payout },
                    { label: 'Upkeep', value: detail.upkeep },
                    { label: 'ROI', value: detail.roi }
                  ]
                : [],
              sections: detail
                ? [
                    { title: 'Summary', body: detail.summary },
                    { title: 'Notes', items: detail.notes }
                  ]
                : []
            })
          );

          return section;
        }
      },
      {
        id: 'upgrades',
        label: 'Upgrades',
        render() {
          const section = document.createElement('section');
          section.className = 'upgrades-view';
          section.textContent = 'Upgrade catalog placeholder';
          return section;
        }
      }
    ]
  });

  presenter.render(model, { mount });

  const header = mount.querySelector('.sample-header');
  assert.ok(header, 'workspace header should render');
  assert.match(header.textContent, /Sample Asset Console/);
  assert.match(header.textContent, /Launchpad humming/);

  const navButtons = [...mount.querySelectorAll('.sample-tab')];
  assert.equal(navButtons.length, 2, 'expected nav buttons for each view');
  assert.deepEqual(
    navButtons.map(button => button.dataset.view),
    ['overview', 'upgrades'],
    'nav buttons should advertise matching dataset view values'
  );

  const kpiCards = [...mount.querySelectorAll('.sample-kpis .asset-kpi')];
  assert.equal(kpiCards.length, 2, 'expected KPI cards for hero metrics');
  assert.ok(kpiCards[0].textContent.includes('Active apps'));

  const rows = [...mount.querySelectorAll('.sample-table tbody tr')];
  assert.equal(rows.length, 2, 'expected table rows for each instance');
  assert.ok(rows[0].classList.contains('is-selected'), 'first row selected by ensureSelection');

  let detail = mount.querySelector('.sample-detail');
  assert.ok(detail.textContent.includes('Alpha app is cruising'));

  rows[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  const updatedRows = [...mount.querySelectorAll('.sample-table tbody tr')];
  assert.ok(updatedRows[1].classList.contains('is-selected'), 'click should select new row');
  assert.ok(!updatedRows[0].classList.contains('is-selected'), 'first row should lose selection');

  detail = mount.querySelector('.sample-detail');
  assert.ok(detail.textContent.includes('Beta app is prepping'), 'detail panel updates for selection');

  const launchButton = header.querySelector('[data-testid="launch-action"]');
  launchButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(launchEvents.length, 1, 'header action invokes provided handler');

  navButtons[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.ok(mount.querySelector('.upgrades-view'), 'switching views renders alternate section');
  assert.ok(!mount.querySelector('.overview-view'), 'overview content should be replaced');
});
