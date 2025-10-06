import { formatMoney, formatHours } from '../../../core/helpers.js';
import { setText } from './dom.js';

function countActiveAssets(state) {
  if (!state?.assets) return 0;
  return Object.values(state.assets).reduce((total, assetState) => {
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const active = instances.filter(instance => instance?.status === 'active').length;
    return total + active;
  }, 0);
}

export function renderOverview(container, state) {
  const events = Array.isArray(state?.events?.active) ? state.events.active.length : 0;
  const summary = {
    day: `Day ${Math.max(1, Number(state?.day) || 1)}`,
    money: `$${formatMoney(Number(state?.money) || 0)}`,
    time: formatHours(Math.max(0, Number(state?.timeLeft) || 0)),
    assets: countActiveAssets(state),
    events,
    updated: new Date().toLocaleString()
  };

  setText(container, '[data-dev-field="day"]', summary.day);
  setText(container, '[data-dev-field="money"]', summary.money);
  setText(container, '[data-dev-field="time"]', summary.time);
  setText(container, '[data-dev-field="assets"]', String(summary.assets));
  setText(container, '[data-dev-field="events"]', String(summary.events));
  setText(container, '[data-dev-field="updated"]', summary.updated);
}

export default renderOverview;
