import notificationsPresenter from './notificationsPresenter.js';

const DEFAULT_EMPTY_MESSAGE = 'Log is quiet. Run a hustle or buy an upgrade.';

function toNotificationEntry(entry) {
  if (!entry) return null;
  const timestamp = Number(entry.timestamp);
  return {
    id: entry.id ?? `log:${Date.now()}`,
    message: entry.message ?? '',
    type: entry.type ?? 'info',
    read: entry.read === true,
    timeLabel: entry.timeLabel ?? '',
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  };
}

function render(model = {}) {
  const entries = Array.isArray(model?.entries) ? model.entries : [];
  const notifications = entries.map(toNotificationEntry).filter(Boolean);
  notificationsPresenter.render({
    entries: notifications.slice(0, 4),
    allEntries: notifications,
    emptyMessage: model?.isEmpty ? DEFAULT_EMPTY_MESSAGE : model?.emptyMessage || DEFAULT_EMPTY_MESSAGE
  });
}

export default {
  render
};
