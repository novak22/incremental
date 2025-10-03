import test from 'node:test';
import assert from 'node:assert/strict';
import notificationsService from '../../src/ui/notifications/service.js';

function resetService() {
  const snapshot = notificationsService.getSnapshot();
  snapshot.forEach(entry => {
    notificationsService.dismiss(entry.id);
  });
}

test.afterEach(() => {
  resetService();
});

test('publish stores notifications keyed by id', () => {
  resetService();
  const entry = notificationsService.publish({
    id: 'asset:alpha',
    label: 'Alpha needs upkeep',
    message: '1 build waiting on hours.'
  });

  assert.equal(entry?.id, 'asset:alpha');
  assert.equal(entry?.message, '1 build waiting on hours.');

  let snapshot = notificationsService.getSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].label, 'Alpha needs upkeep');

  notificationsService.publish({
    id: 'asset:alpha',
    message: '1 build waiting on cash.'
  });

  snapshot = notificationsService.getSnapshot();
  assert.equal(snapshot.length, 1, 'publish should deduplicate by id');
  assert.equal(snapshot[0].message, '1 build waiting on cash.');
});

test('subscribe notifies listeners when notifications change', () => {
  resetService();
  const received = [];
  const unsubscribe = notificationsService.subscribe(entries => {
    received.push(entries);
  });

  notificationsService.publish({
    id: 'asset:beta',
    label: 'Beta upkeep stalled',
    message: 'Waiting on cash.'
  });

  notificationsService.dismiss('asset:beta');
  unsubscribe();

  assert.ok(received.length >= 2, 'subscribe should push initial and update payloads');
  const [initialEntries, afterPublish, afterDismiss] = received;
  assert.equal(Array.isArray(initialEntries), true);
  assert.equal(afterPublish?.[0]?.id, 'asset:beta');
  assert.equal(afterDismiss?.length ?? 0, 0);
});
