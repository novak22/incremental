import { COFFEE_LIMIT } from '../core/constants.js';
import { formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { getAssetState, getState, getUpgradeState } from '../core/state.js';
import { executeAction } from './actions.js';
import { gainTime } from './time.js';
import {
  ASSISTANT_CONFIG,
  canFireAssistant,
  canHireAssistant,
  fireAssistant,
  getAssistantCount,
  getAssistantDailyCost,
  hireAssistant
} from './assistant.js';
import { checkDayEnd } from './lifecycle.js';
import { spendMoney } from './currency.js';

export const UPGRADES = [
  {
    id: 'assistant',
    name: 'Hire Virtual Assistant',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Scale your admin squad. Each hire adds hours but expects daily wages.',
    defaultState: {
      count: 0
    },
    details: [
      () => `💵 Hiring Cost: <strong>$${formatMoney(ASSISTANT_CONFIG.hiringCost)}</strong>`,
      () => `👥 Team Size: <strong>${getAssistantCount()} / ${ASSISTANT_CONFIG.maxAssistants}</strong>`,
      () => `⏳ Support: <strong>+${ASSISTANT_CONFIG.hoursPerAssistant}h per assistant</strong>`,
      () =>
        `💰 Payroll: <strong>$${formatMoney(
          ASSISTANT_CONFIG.hourlyRate * ASSISTANT_CONFIG.hoursPerAssistant
        )}</strong> each day per assistant`,
      () => `📅 Current Payroll: <strong>$${formatMoney(getAssistantDailyCost())} / day</strong>`
    ],
    action: {
      label: () => {
        const count = getAssistantCount();
        if (count >= ASSISTANT_CONFIG.maxAssistants) return 'Assistant Team Full';
        return 'Hire Assistant';
      },
      className: 'secondary',
      disabled: () => !canHireAssistant(),
      onClick: () => executeAction(() => {
        hireAssistant();
      })
    },
    extraContent: card => {
      const row = document.createElement('div');
      row.className = 'inline-actions';
      const fireButton = document.createElement('button');
      fireButton.className = 'secondary';
      fireButton.type = 'button';
      fireButton.textContent = 'Fire Assistant';
      fireButton.addEventListener('click', () => {
        if (fireButton.disabled) return;
        executeAction(() => {
          const removed = fireAssistant();
          if (removed && getState().timeLeft <= 0) {
            checkDayEnd();
          }
        });
      });
      row.appendChild(fireButton);
      card.appendChild(row);
      return { fireButton };
    },
    update: (_state, ui) => {
      if (!ui?.extra?.fireButton) return;
      const count = getAssistantCount();
      ui.extra.fireButton.disabled = !canFireAssistant();
      ui.extra.fireButton.textContent = count > 0 ? 'Fire Assistant' : 'No Assistants Hired';
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
