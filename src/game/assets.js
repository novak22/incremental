import { BLOG_CHUNK, BLOG_INTERVAL_SECONDS } from '../core/constants.js';
import { formatHours, formatList, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { createAssetInstance, getAssetDefinition, getAssetState, getState } from '../core/state.js';
import { addMoney, spendMoney } from './currency.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { spendTime } from './time.js';
import {
  assetRequirementsMetById,
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock
} from './requirements.js';

export const ASSETS = [
  {
    id: 'blog',
    name: 'Personal Blog',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Launch a blog that trickles income while you sip questionable coffee.',
    maintenanceTime: 1,
    dailyPayout: 45,
    defaultState: {
      instances: [],
      multiplier: 1,
      active: false,
      buffer: 0,
      fundedToday: false
    },
    details: [
      () => '⏳ Setup Time: <strong>3h</strong>',
      () => '💵 Setup Cost: <strong>$25</strong>',
      () => {
        const asset = getAssetState('blog');
        const perInstance = BLOG_CHUNK * asset.multiplier;
        const active = asset.instances.length;
        const total = perInstance * active;
        const totalLabel = active ? ` | Total: <strong>$${formatMoney(total)} / 10s</strong>` : '';
        return `💸 Income: <strong>$${formatMoney(perInstance)} / 10s</strong> per blog${totalLabel}`;
      },
      () => {
        const asset = getAssetState('blog');
        const status = asset.fundedToday ? 'Funded' : 'Unfunded';
        const assetDef = getAssetDefinition('blog');
        return `🛠 Maintenance: <strong>${formatHours(assetDef.maintenanceTime)} / day</strong> (${status})`;
      },
      () => `📆 Daily Payout: <strong>$${formatMoney(getAssetDefinition('blog').dailyPayout)}</strong>`
    ],
    action: {
      label: () => {
        const count = getAssetState('blog').instances.length;
        return count ? 'Launch Another Blog' : 'Launch Blog';
      },
      className: 'primary',
      disabled: () => {
        const state = getState();
        return state.timeLeft < 3 || state.money < 25;
      },
      onClick: () => {
        executeAction(() => {
          const asset = getAssetState('blog');
          spendTime(3);
          spendMoney(25);
          const newInstance = createAssetInstance();
          asset.instances.push(newInstance);
          const index = asset.instances.length;
          addLog(
            `You launched blog #${index}! Expect slow trickles of internet fame and $${formatMoney(BLOG_CHUNK)} every 10 seconds from each.`,
            'passive'
          );
          asset.active = true;
          asset.buffer = 0;
          asset.fundedToday = false;
        });
        checkDayEnd();
      }
    },
    passiveIncome: {
      interval: BLOG_INTERVAL_SECONDS,
      logType: 'passive',
      message: amount => `Your blog quietly earned $${formatMoney(amount)} while you scrolled memes.`,
      offlineMessage: total => `Your blog earned $${formatMoney(total)} while you were offline. Not too shabby!`
    },
    extraContent: card => {
      const container = document.createElement('div');
      container.className = 'asset-instances';
      card.appendChild(container);
      return { container };
    },
    update: (_state, ui) => {
      if (!ui.extra?.container) return;
      renderBlogInstances(ui.extra.container);
    },
    isActive: (_state, assetState) => assetState.instances.length > 0 && assetState.fundedToday,
    getIncomeAmount: (_state, assetState) => BLOG_CHUNK * assetState.multiplier
  },
  {
    id: 'vlog',
    name: 'Vlog Channel',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Shoot and edit weekly vlogs to build your creator empire.',
    requiresUpgrade: 'camera',
    defaultState: {
      active: false,
      buffer: 0,
      multiplier: 1
    },
    details: [
      () => '⏳ Setup Time: <strong>4h</strong>',
      () => '💵 Setup Cost: <strong>$150</strong>',
      () => '🛠 Maintenance: <strong>1h/day</strong>',
      () => renderAssetRequirementDetail('vlog'),
      () => {
        const asset = getAssetState('vlog');
        const income = 9 * asset.multiplier;
        return `💸 Income: <strong>$${formatMoney(income)} / 15s</strong>`;
      }
    ],
    action: {
      label: () => {
        const asset = getAssetState('vlog');
        if (asset.active) return 'Channel Running';
        if (!assetRequirementsMetById('vlog')) {
          return formatAssetRequirementLabel('vlog');
        }
        return 'Launch Channel';
      },
      className: 'primary',
      disabled: () => {
        const state = getState();
        const asset = getAssetState('vlog');
        if (asset.active) return true;
        if (!assetRequirementsMetById('vlog')) return true;
        if (state.timeLeft < 4) return true;
        if (state.money < 150) return true;
        return false;
      },
      onClick: () => {
        executeAction(() => {
          const state = getState();
          const asset = getAssetState('vlog');
          if (asset.active || !assetRequirementsMetById('vlog')) {
            addLog('You need the right gear before filming can begin.', 'info');
            return;
          }
          spendTime(4);
          spendMoney(150);
          asset.active = true;
          asset.buffer = 0;
          addLog('Lights, camera, payout! Your vlog channel is live and ready to monetize every 15 seconds.', 'passive');
        });
        checkDayEnd();
      }
    },
    passiveIncome: {
      interval: 15,
      logType: 'passive',
      message: amount => `Your vlog racked up views for $${formatMoney(amount)} while you edited thumbnails.`,
      offlineMessage: total => `Your vlog library brought in $${formatMoney(total)} while you were AFK. Influencer vibes!`
    },
    isActive: (_state, assetState) => assetState.active,
    getIncomeAmount: (_state, assetState) => 9 * assetState.multiplier,
    cardState: (_state, card) => updateAssetCardLock('vlog', card)
  },
  {
    id: 'podcast',
    name: 'Podcast Series',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Record interviews and schedule drops that keep listeners binging.',
    requiresUpgrade: 'studio',
    defaultState: {
      active: false,
      buffer: 0,
      multiplier: 1
    },
    details: [
      () => '⏳ Setup Time: <strong>5h</strong>',
      () => '💵 Setup Cost: <strong>$220</strong>',
      () => '🛠 Maintenance: <strong>1.5h/day</strong>',
      () => renderAssetRequirementDetail('podcast'),
      () => {
        const asset = getAssetState('podcast');
        const income = 25 * asset.multiplier;
        return `💸 Income: <strong>$${formatMoney(income)} / 30s</strong>`;
      }
    ],
    action: {
      label: () => {
        const asset = getAssetState('podcast');
        if (asset.active) return 'Podcast Syndicated';
        if (!assetRequirementsMetById('podcast')) {
          return formatAssetRequirementLabel('podcast');
        }
        return 'Produce Season';
      },
      className: 'primary',
      disabled: () => {
        const state = getState();
        const asset = getAssetState('podcast');
        if (asset.active) return true;
        if (!assetRequirementsMetById('podcast')) return true;
        if (state.timeLeft < 5) return true;
        if (state.money < 220) return true;
        return false;
      },
      onClick: () => {
        executeAction(() => {
          const asset = getAssetState('podcast');
          if (asset.active || !assetRequirementsMetById('podcast')) {
            addLog('Set up your studio before you can hit record on that podcast.', 'info');
            return;
          }
          spendTime(5);
          spendMoney(220);
          asset.active = true;
          asset.buffer = 0;
          addLog('Your podcast season is queued! Sponsors drip $25 every 30 seconds while episodes drop.', 'passive');
        });
        checkDayEnd();
      }
    },
    passiveIncome: {
      interval: 30,
      logType: 'passive',
      message: amount => `Podcast downloads surged, netting $${formatMoney(amount)} in sponsor cash.`,
      offlineMessage: total => `Your podcast backlog pulled $${formatMoney(total)} while you were off-mic. Nice!`
    },
    isActive: (_state, assetState) => assetState.active,
    getIncomeAmount: (_state, assetState) => 25 * assetState.multiplier,
    cardState: (_state, card) => updateAssetCardLock('podcast', card)
  }
];

export function renderBlogInstances(container) {
  if (!container) return;
  const asset = getAssetState('blog');
  container.innerHTML = '';

  if (!asset.instances.length) {
    const empty = document.createElement('p');
    empty.className = 'instance-empty';
    empty.textContent = 'No blogs are running yet.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'instance-list';

  asset.instances.forEach((instance, index) => {
    const item = document.createElement('li');
    item.className = 'instance-row';

    const label = document.createElement('span');
    label.className = 'instance-label';
    label.textContent = `Blog #${index + 1}`;

    const status = document.createElement('span');
    status.className = 'instance-status';
    const perInstance = BLOG_CHUNK * asset.multiplier;
    status.textContent = `$${formatMoney(perInstance)} / 10s`;

    item.appendChild(label);
    item.appendChild(status);
    list.appendChild(item);
  });

  container.appendChild(list);
}

export function collectPassiveIncome(assetDef, elapsedSeconds, offline = false) {
  const state = getState();
  if (!assetDef.passiveIncome || !state) return 0;
  const assetState = getAssetState(assetDef.id);
  if (assetDef.isActive && !assetDef.isActive(state, assetState)) return 0;
  if (!assetDef.passiveIncome.interval) return 0;

  const instances = Array.isArray(assetState.instances) ? assetState.instances : [];
  let payouts = 0;

  for (const instance of instances) {
    const chunkValue = assetDef.getIncomeAmount ? assetDef.getIncomeAmount(state, assetState, instance) : 0;
    if (!chunkValue) continue;

    const ratePerSecond = chunkValue / assetDef.passiveIncome.interval;
    instance.buffer += ratePerSecond * elapsedSeconds;

    while (instance.buffer >= chunkValue) {
      instance.buffer -= chunkValue;
      payouts += chunkValue;
      if (offline) {
        state.money += chunkValue;
      } else {
        addMoney(
          chunkValue,
          assetDef.passiveIncome.message ? assetDef.passiveIncome.message(chunkValue) : null,
          assetDef.passiveIncome.logType || 'passive'
        );
      }
    }
  }

  return payouts;
}

export function closeOutDay() {
  const state = getState();
  if (!state) return;
  const unfunded = [];

  for (const asset of ASSETS) {
    const assetState = getAssetState(asset.id);
    if (!assetState.active) {
      assetState.fundedToday = false;
      continue;
    }

    if (assetState.fundedToday) {
      if (asset.dailyPayout) {
        addMoney(
          asset.dailyPayout,
          `${asset.name} delivered its $${formatMoney(asset.dailyPayout)} daily payout after proper upkeep.`,
          'passive'
        );
      }
    } else if (asset.dailyPayout) {
      unfunded.push(asset.name);
    }

    assetState.fundedToday = false;
  }

  if (unfunded.length) {
    addLog(
      `${formatList(unfunded)} couldn't stay online without maintenance today. No daily payout for them.`,
      'warning'
    );
  }
}

export function allocateAssetMaintenance() {
  const state = getState();
  if (!state) return;

  const funded = [];
  const skipped = [];

  for (const asset of ASSETS) {
    const assetState = getAssetState(asset.id);
    if (!assetState.active) {
      assetState.fundedToday = false;
      continue;
    }

    const maintenance = Number(asset.maintenanceTime) || 0;
    if (maintenance <= 0) {
      assetState.fundedToday = true;
      funded.push(asset.name);
      continue;
    }

    if (state.timeLeft >= maintenance) {
      state.timeLeft -= maintenance;
      assetState.fundedToday = true;
      funded.push(asset.name);
    } else {
      assetState.fundedToday = false;
      skipped.push(asset.name);
    }
  }

  if (funded.length) {
    addLog(`You budgeted maintenance time for ${formatList(funded)}.`, 'info');
  }
  if (skipped.length) {
    addLog(
      `${formatList(skipped)} couldn't be maintained today and are paused until you free up more hours.`,
      'warning'
    );
  }
}
