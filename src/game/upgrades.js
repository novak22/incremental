import { COFFEE_LIMIT } from '../core/constants.js';
import { addLog } from '../core/log.js';
import { getAssetState, getState, getUpgradeState } from '../core/state.js';
import { spendMoney } from './currency.js';
import { executeAction } from './actions.js';
import { gainTime } from './time.js';

export const UPGRADES = [
  {
    id: 'assistant',
    name: 'Hire Virtual Assistant',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Add +2h to your daily grind. They handle the boring stuff.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$180</strong>'
    ],
    action: {
      label: () => getUpgradeState('assistant').purchased ? 'Assistant Hired' : 'Hire Assistant',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('assistant');
        return upgrade.purchased || getState().money < 180;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('assistant');
        if (upgrade.purchased) return;
        spendMoney(180);
        upgrade.purchased = true;
        const state = getState();
        state.bonusTime += 2;
        gainTime(2);
        addLog('You hired a virtual assistant who adds +2h to your day and handles inbox chaos.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const purchased = getUpgradeState('assistant').purchased;
      card.classList.toggle('locked', purchased);
    }
  },
  {
    id: 'camera',
    name: 'Buy Camera',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Unlocks video production gear so you can start vlogs and shoot stock photos.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$200</strong>',
      () => 'Unlocks: <strong>Weekly Vlog Channel & Stock Photo Galleries</strong>'
    ],
    action: {
      label: () => getUpgradeState('camera').purchased ? 'Camera Ready' : 'Purchase Camera',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('camera');
        if (upgrade.purchased) return true;
        return getState().money < 200;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('camera');
        if (upgrade.purchased) return;
        spendMoney(200);
        upgrade.purchased = true;
        addLog('You bought a mirrorless camera rig. Vlogs and photo galleries just unlocked!', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('camera');
      card.classList.toggle('locked', upgrade.purchased);
    }
  },
  {
    id: 'studio',
    name: 'Lighting Kit',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Soft boxes, reflectors, and editing presets for glossier stock photos.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$220</strong>',
      () => 'Unlocks: <strong>Stock Photo Galleries</strong>'
    ],
    action: {
      label: () => getUpgradeState('studio').purchased ? 'Studio Ready' : 'Build Studio',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('studio');
        if (upgrade.purchased) return true;
        return getState().money < 260;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('studio');
        if (upgrade.purchased) return;
        spendMoney(220);
        upgrade.purchased = true;
        addLog('Lighting kit assembled! Your stock photo galleries now shine in marketplaces.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('studio');
      card.classList.toggle('locked', upgrade.purchased);
    }
  },
  {
    id: 'coffee',
    name: 'Turbo Coffee',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Instantly gain +1h of focus for today. Side effects include jittery success.',
    defaultState: {
      usedToday: 0
    },
    details: [
      () => '💵 Cost: <strong>$40</strong>',
      () => `Daily limit: <strong>${COFFEE_LIMIT}</strong>`
    ],
    action: {
      label: () => {
        const upgrade = getUpgradeState('coffee');
        return upgrade.usedToday >= COFFEE_LIMIT ? 'Too Much Caffeine' : 'Brew Boost';
      },
      className: 'secondary',
      disabled: () => {
        const state = getState();
        const upgrade = getUpgradeState('coffee');
        return state.money < 40 || upgrade.usedToday >= COFFEE_LIMIT || state.timeLeft <= 0;
      },
      onClick: () => executeAction(() => {
        const state = getState();
        const upgrade = getUpgradeState('coffee');
        if (upgrade.usedToday >= COFFEE_LIMIT) return;
        spendMoney(40);
        upgrade.usedToday += 1;
        state.dailyBonusTime += 1;
        gainTime(1);
        addLog('Turbo coffee acquired! You feel invincible for another hour (ish).', 'boost');
      })
    }
  },
  {
    id: 'course',
    name: 'Automation Course',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Unlocks smarter blogging tools, boosting blog income by +50%.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$260</strong>',
      () => 'Requires at least one active blog'
    ],
    action: {
      label: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return 'Automation Ready';
        return getAssetState('blog').instances.length ? 'Study Up' : 'Requires Active Blog';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return true;
        const blogActive = getAssetState('blog').instances.length > 0;
        if (!blogActive) return true;
        return getState().money < 260;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('course');
        const blog = getAssetState('blog');
        if (upgrade.purchased || !blog.instances.length) return;
        spendMoney(260);
        upgrade.purchased = true;
        addLog('Automation course complete! Your blog network now earns +50% more each day.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('course');
      const blogActive = getAssetState('blog').instances.length > 0;
      card.classList.toggle('locked', !blogActive && !upgrade.purchased);
    }
  }
];
