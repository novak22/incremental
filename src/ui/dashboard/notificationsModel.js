import { formatMoney } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { getAssetState } from '../../core/state.js';
import { getAssets, getUpgrades } from '../../game/registryService.js';

export function buildNotifications(state = {}) {
  const notifications = [];

  for (const asset of getAssets()) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const maintenanceDue = instances.filter(instance => instance?.status === 'active' && !instance.maintenanceFundedToday);
    if (maintenanceDue.length) {
      notifications.push({
        id: `${asset.id}:maintenance`,
        label: `${asset.name} needs upkeep`,
        message: `${maintenanceDue.length} build${maintenanceDue.length === 1 ? '' : 's'} waiting for maintenance`,
        action: { type: 'shell-tab', tabId: 'tab-ventures' }
      });
    }
  }

  const affordableUpgrades = getUpgrades().filter(upgrade => {
    const cost = clampNumber(upgrade.cost);
    if (cost <= 0) return false;
    const owned = state?.upgrades?.[upgrade.id]?.purchased;
    if (owned && !upgrade.repeatable) return false;
    return clampNumber(state?.money) >= cost;
  });

  affordableUpgrades.slice(0, 3).forEach(upgrade => {
    notifications.push({
      id: `${upgrade.id}:upgrade`,
      label: `${upgrade.name} is affordable`,
      message: `$${formatMoney(upgrade.cost)} ready to invest`,
      action: { type: 'shell-tab', tabId: 'tab-upgrades' }
    });
  });

  return notifications;
}

export function formatEventLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const timestamp = Number(entry.timestamp);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;

  return {
    id: entry.id || (Number.isFinite(timestamp) ? `log:${timestamp}` : `log:${Date.now()}`),
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    message: String(entry.message ?? ''),
    type: typeof entry.type === 'string' && entry.type ? entry.type : 'info',
    read: entry.read === true,
    timeLabel: date
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  };
}

export function buildEventLog(state = {}) {
  const log = Array.isArray(state.log) ? [...state.log] : [];
  if (!log.length) {
    return [];
  }

  return log
    .slice()
    .sort((a, b) => {
      const aTime = Number(a?.timestamp) || 0;
      const bTime = Number(b?.timestamp) || 0;
      return bTime - aTime;
    })
    .map(formatEventLogEntry)
    .filter(Boolean);
}

export function buildNotificationModel(state = {}) {
  const entries = buildNotifications(state);
  return {
    entries,
    emptyMessage: 'All clear. Nothing urgent on deck.'
  };
}

export function buildEventLogModel(state = {}) {
  const allEntries = buildEventLog(state);
  return {
    entries: allEntries.slice(0, 4),
    allEntries,
    emptyMessage: 'Log is quiet. Run a hustle or buy an upgrade.'
  };
}

export default buildNotificationModel;

