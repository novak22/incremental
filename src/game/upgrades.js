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
import { recordCostContribution } from './metrics.js';
import { describeRequirement, isRequirementMet } from './requirements.js';
import { buildRequirementBundle } from './schema/requirements.js';

const CAMERA_PRO_REQUIREMENTS = { equipment: ['camera'] };
const CAMERA_PRO_REQUIREMENT_BUNDLE = buildRequirementBundle(CAMERA_PRO_REQUIREMENTS);
const STUDIO_EXPANSION_REQUIREMENTS = { equipment: ['studio'] };
const STUDIO_EXPANSION_REQUIREMENT_BUNDLE = buildRequirementBundle(STUDIO_EXPANSION_REQUIREMENTS);
const SERVER_CLUSTER_REQUIREMENTS = { equipment: ['serverRack'] };
const SERVER_CLUSTER_REQUIREMENT_BUNDLE = buildRequirementBundle(SERVER_CLUSTER_REQUIREMENTS);
const SERVER_EDGE_REQUIREMENTS = { equipment: ['serverCluster'] };
const SERVER_EDGE_REQUIREMENT_BUNDLE = buildRequirementBundle(SERVER_EDGE_REQUIREMENTS);
const COURSE_REQUIREMENTS = { experience: [{ assetId: 'blog', count: 1 }] };
const COURSE_REQUIREMENT_BUNDLE = buildRequirementBundle(COURSE_REQUIREMENTS);

function summarizeMissingRequirementLabels(bundle) {
  if (!bundle?.hasAny) return '';
  const missing = bundle.missing(isRequirementMet);
  if (!missing.length) return '';
  const labels = missing.map(req => describeRequirement(req).label);
  return labels.join(' & ');
}

function formatRequirementHeadline(bundle) {
  if (!bundle?.hasAny) return 'None';
  const labels = bundle.map(req => describeRequirement(req).label);
  return labels.join(' & ');
}

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
      id: 'hireAssistant',
      timeCost: 0,
      moneyCost: ASSISTANT_CONFIG.hiringCost,
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
      id: 'purchaseCamera',
      timeCost: 0,
      moneyCost: 200,
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
        recordCostContribution({
          key: 'upgrade:camera',
          label: '🎥 Camera purchase',
          amount: 200,
          category: 'upgrade'
        });
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
      id: 'buildStudio',
      timeCost: 0,
      moneyCost: 220,
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
        recordCostContribution({
          key: 'upgrade:studio',
          label: '💡 Lighting kit upgrade',
          amount: 220,
          category: 'upgrade'
        });
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
    id: 'cameraPro',
    name: 'Cinema Camera Upgrade',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Upgrade your rig with cinema glass and stabilized mounts for prestige productions.',
    defaultState: {
      purchased: false
    },
    requirements: CAMERA_PRO_REQUIREMENTS,
    details: [
      () => '💵 Cost: <strong>$480</strong>',
      () => `Requires: <strong>${formatRequirementHeadline(CAMERA_PRO_REQUIREMENT_BUNDLE)}</strong>`,
      () => 'Boosts: <strong>Higher vlog quality payouts</strong>'
    ],
    requirements: [{ type: 'upgrade', id: 'camera' }],
    action: {
      id: 'installCinemaGear',
      timeCost: 0,
      moneyCost: 480,
      label: () => {
        const upgrade = getUpgradeState('cameraPro');
        if (upgrade.purchased) return 'Cinema Ready';
        const missing = summarizeMissingRequirementLabels(CAMERA_PRO_REQUIREMENT_BUNDLE);
        if (missing) return `Requires ${missing}`;
        return 'Install Cinema Gear';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('cameraPro');
        if (upgrade.purchased) return true;
        if (summarizeMissingRequirementLabels(CAMERA_PRO_REQUIREMENT_BUNDLE)) return true;
        return getState().money < 480;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('cameraPro');
        if (upgrade.purchased || summarizeMissingRequirementLabels(CAMERA_PRO_REQUIREMENT_BUNDLE)) return;
        spendMoney(480);
        recordCostContribution({
          key: 'upgrade:cameraPro',
          label: '🎬 Cinema camera upgrade',
          amount: 480,
          category: 'upgrade'
        });
        upgrade.purchased = true;
        addLog('Cinema camera calibrated! Your vlogs now look blockbuster-bright.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('cameraPro');
      card.classList.toggle('locked', upgrade.purchased);
      const missing = summarizeMissingRequirementLabels(CAMERA_PRO_REQUIREMENT_BUNDLE);
      card.classList.toggle('requires-upgrade', Boolean(missing) && !upgrade.purchased);
    }
  },
  {
    id: 'studioExpansion',
    name: 'Studio Expansion',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Add modular sets, color-controlled lighting, and prop storage for faster shoots.',
    defaultState: {
      purchased: false
    },
    requirements: STUDIO_EXPANSION_REQUIREMENTS,
    details: [
      () => '💵 Cost: <strong>$540</strong>',
      () => `Requires: <strong>${formatRequirementHeadline(STUDIO_EXPANSION_REQUIREMENT_BUNDLE)}</strong>`,
      () => 'Boosts: <strong>Stock photo session efficiency</strong>'
    ],
    requirements: [{ type: 'upgrade', id: 'studio' }],
    action: {
      id: 'expandStudio',
      timeCost: 0,
      moneyCost: 540,
      label: () => {
        const upgrade = getUpgradeState('studioExpansion');
        if (upgrade.purchased) return 'Studio Expanded';
        const missing = summarizeMissingRequirementLabels(STUDIO_EXPANSION_REQUIREMENT_BUNDLE);
        if (missing) return `Requires ${missing}`;
        return 'Expand Studio';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('studioExpansion');
        if (upgrade.purchased) return true;
        if (summarizeMissingRequirementLabels(STUDIO_EXPANSION_REQUIREMENT_BUNDLE)) return true;
        return getState().money < 540;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('studioExpansion');
        if (upgrade.purchased || summarizeMissingRequirementLabels(STUDIO_EXPANSION_REQUIREMENT_BUNDLE)) return;
        spendMoney(540);
        recordCostContribution({
          key: 'upgrade:studioExpansion',
          label: '🏗️ Studio expansion build-out',
          amount: 540,
          category: 'upgrade'
        });
        upgrade.purchased = true;
        addLog('Studio expansion complete! You now glide through photo shoots with cinematic flair.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('studioExpansion');
      card.classList.toggle('locked', upgrade.purchased);
      const missing = summarizeMissingRequirementLabels(STUDIO_EXPANSION_REQUIREMENT_BUNDLE);
      card.classList.toggle('requires-upgrade', Boolean(missing) && !upgrade.purchased);
    }
  },
  {
    id: 'serverRack',
    name: 'Server Rack - Starter',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Spin up a reliable rack with monitoring so prototypes stay online.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$650</strong>',
      () => 'Unlocks: <strong>Stable environments for advanced products</strong>'
    ],
    action: {
      id: 'installServerRack',
      timeCost: 0,
      moneyCost: 650,
      label: () => (getUpgradeState('serverRack').purchased ? 'Rack Online' : 'Install Rack'),
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('serverRack');
        if (upgrade.purchased) return true;
        return getState().money < 650;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('serverRack');
        if (upgrade.purchased) return;
        spendMoney(650);
        recordCostContribution({
          key: 'upgrade:serverRack',
          label: '🗄️ Starter server rack install',
          amount: 650,
          category: 'infrastructure'
        });
        upgrade.purchased = true;
        addLog('Server rack assembled! Your advanced projects now have a home base.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('serverRack');
      card.classList.toggle('locked', upgrade.purchased);
    }
  },
  {
    id: 'serverCluster',
    name: 'Cloud Cluster',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Deploy auto-scaling containers and CI pipelines so your SaaS survives launch day.',
    defaultState: {
      purchased: false
    },
    requirements: SERVER_CLUSTER_REQUIREMENTS,
    details: [
      () => '💵 Cost: <strong>$1,150</strong>',
      () => `Requires: <strong>${formatRequirementHeadline(SERVER_CLUSTER_REQUIREMENT_BUNDLE)}</strong>`,
      () => 'Unlocks: <strong>SaaS deployments</strong>'
    ],
    requirements: [{ type: 'upgrade', id: 'serverRack' }],
    action: {
      id: 'deployCloudCluster',
      timeCost: 0,
      moneyCost: 1150,
      label: () => {
        const upgrade = getUpgradeState('serverCluster');
        if (upgrade.purchased) return 'Cluster Ready';
        const missing = summarizeMissingRequirementLabels(SERVER_CLUSTER_REQUIREMENT_BUNDLE);
        if (missing) return `Requires ${missing}`;
        return 'Deploy Cluster';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('serverCluster');
        if (upgrade.purchased) return true;
        if (summarizeMissingRequirementLabels(SERVER_CLUSTER_REQUIREMENT_BUNDLE)) return true;
        return getState().money < 1150;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('serverCluster');
        if (upgrade.purchased || summarizeMissingRequirementLabels(SERVER_CLUSTER_REQUIREMENT_BUNDLE)) return;
        spendMoney(1150);
        recordCostContribution({
          key: 'upgrade:serverCluster',
          label: '☁️ Cloud cluster deployment',
          amount: 1150,
          category: 'infrastructure'
        });
        upgrade.purchased = true;
        addLog('Cloud cluster humming! SaaS deploy pipelines now run without midnight fire drills.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('serverCluster');
      card.classList.toggle('locked', upgrade.purchased);
      const missing = summarizeMissingRequirementLabels(SERVER_CLUSTER_REQUIREMENT_BUNDLE);
      card.classList.toggle('requires-upgrade', Boolean(missing) && !upgrade.purchased);
    }
  },
  {
    id: 'serverEdge',
    name: 'Edge Delivery Network',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Distribute workloads across edge nodes for instant response times and uptime bragging rights.',
    defaultState: {
      purchased: false
    },
    requirements: SERVER_EDGE_REQUIREMENTS,
    details: [
      () => '💵 Cost: <strong>$1,450</strong>',
      () => `Requires: <strong>${formatRequirementHeadline(SERVER_EDGE_REQUIREMENT_BUNDLE)}</strong>`,
      () => 'Boosts: <strong>SaaS subscriber trust</strong>'
    ],
    requirements: [{ type: 'upgrade', id: 'serverCluster' }],
    action: {
      id: 'activateEdgeNetwork',
      timeCost: 0,
      moneyCost: 1450,
      label: () => {
        const upgrade = getUpgradeState('serverEdge');
        if (upgrade.purchased) return 'Edge Live';
        const missing = summarizeMissingRequirementLabels(SERVER_EDGE_REQUIREMENT_BUNDLE);
        if (missing) return `Requires ${missing}`;
        return 'Activate Edge Network';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('serverEdge');
        if (upgrade.purchased) return true;
        if (summarizeMissingRequirementLabels(SERVER_EDGE_REQUIREMENT_BUNDLE)) return true;
        return getState().money < 1450;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('serverEdge');
        if (upgrade.purchased || summarizeMissingRequirementLabels(SERVER_EDGE_REQUIREMENT_BUNDLE)) return;
        spendMoney(1450);
        recordCostContribution({
          key: 'upgrade:serverEdge',
          label: '🌐 Edge delivery rollout',
          amount: 1450,
          category: 'infrastructure'
        });
        upgrade.purchased = true;
        addLog('Edge network activated! Your SaaS now feels instant from any continent.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('serverEdge');
      card.classList.toggle('locked', upgrade.purchased);
      const missing = summarizeMissingRequirementLabels(SERVER_EDGE_REQUIREMENT_BUNDLE);
      card.classList.toggle('requires-upgrade', Boolean(missing) && !upgrade.purchased);
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
      id: 'brewTurboCoffee',
      timeCost: 0,
      moneyCost: 40,
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
        recordCostContribution({
          key: 'upgrade:coffee',
          label: '☕ Turbo coffee boost',
          amount: 40,
          category: 'consumable'
        });
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
    requirements: COURSE_REQUIREMENTS,
    details: [
      () => '💵 Cost: <strong>$260</strong>',
      () => `Requires: <strong>${formatRequirementHeadline(COURSE_REQUIREMENT_BUNDLE)}</strong>`
    ],
    requirements: [{ type: 'experience', assetId: 'blog', count: 1 }],
    action: {
      id: 'enrollAutomationCourse',
      timeCost: 0,
      moneyCost: 260,
      label: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return 'Automation Ready';
        const missing = summarizeMissingRequirementLabels(COURSE_REQUIREMENT_BUNDLE);
        if (missing) return `Requires ${missing}`;
        return 'Study Up';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return true;
        if (summarizeMissingRequirementLabels(COURSE_REQUIREMENT_BUNDLE)) return true;
        return getState().money < 260;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased || summarizeMissingRequirementLabels(COURSE_REQUIREMENT_BUNDLE)) return;
        spendMoney(260);
        recordCostContribution({
          key: 'upgrade:course',
          label: '📚 Automation course tuition',
          amount: 260,
          category: 'upgrade'
        });
        upgrade.purchased = true;
        addLog('Automation course complete! Your blog network now earns +50% more each day.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('course');
      const missing = summarizeMissingRequirementLabels(COURSE_REQUIREMENT_BUNDLE);
      card.classList.toggle('locked', Boolean(missing) && !upgrade.purchased);
    }
  }
];
