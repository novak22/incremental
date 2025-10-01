import { getAssetState, getState } from '../../core/state.js';
import { formatHours, formatMoney } from '../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../game/hustles/helpers.js';
import {
  assetRequirementsMetById,
  formatAssetRequirementLabel,
  KNOWLEDGE_TRACKS,
  KNOWLEDGE_REWARDS,
  getKnowledgeProgress,
  listAssetRequirementDescriptors
} from '../../game/requirements.js';
import { getTimeCap } from '../../game/time.js';
import { getAssetEffectMultiplier } from '../../game/upgrades/effects.js';
import { normalizeSkillList, getSkillDefinition } from '../../game/skills/data.js';
import { computeDailySummary } from '../../game/summary.js';
import { getAssets, getHustles, getUpgrades } from '../../game/registryService.js';
import { getAssistantCount, getAssistantDailyCost } from '../../game/assistant.js';
import { calculateAssetSalePrice, getDailyIncomeRange, instanceLabel } from '../../game/assets/helpers.js';

const UPGRADE_CATEGORY_ORDER = ['tech', 'house', 'infra', 'support', 'misc'];

const UPGRADE_CATEGORY_COPY = {
  tech: {
    label: 'Tech',
    title: 'Tech gear & gadgets',
    note: 'Outfit your digital arsenal with rigs, cameras, and clever workflows.'
  },
  house: {
    label: 'House',
    title: 'House & studio',
    note: 'Shape the spaces that keep shoots smooth and edits comfy.'
  },
  infra: {
    label: 'Infra',
    title: 'Infrastructure',
    note: 'Scale the back-end brains that keep products humming worldwide.'
  },
  support: {
    label: 'Support',
    title: 'Support boosts',
    note: 'Quick pick-me-ups and helpers that keep momentum rolling.'
  },
  misc: {
    label: 'Special',
    title: 'Special upgrades',
    note: 'One-off perks that refuse to stay in neat boxes.'
  }
};

const UPGRADE_FAMILY_COPY = {
  general: {
    label: 'Highlights',
    note: 'Curated upgrades that don’t mind sharing space.'
  },
  phone: {
    label: 'Phone line',
    note: 'Capture crisp mobile footage and stay responsive on the go.'
  },
  pc: {
    label: 'PC rigs',
    note: 'Crunch renders, spreadsheets, and creative suites without sweat.'
  },
  monitor_hub: {
    label: 'Monitor hubs',
    note: 'Dock displays and fan out fresh screen real estate.'
  },
  monitor: {
    label: 'Monitors',
    note: 'Stack extra displays for editing bays and dashboards.'
  },
  storage: {
    label: 'Storage & scratch',
    note: 'Keep footage safe and project files lightning fast.'
  },
  camera: {
    label: 'Camera gear',
    note: 'Level up lenses and rigs so every frame looks cinematic.'
  },
  lighting: {
    label: 'Lighting rigs',
    note: 'Bathe shoots in flattering glow and zero fuss shadows.'
  },
  audio: {
    label: 'Audio gear',
    note: 'Capture buttery vocals and clean ambient sound.'
  },
  internet: {
    label: 'Internet plans',
    note: 'Feed uploads and live drops with consistent bandwidth.'
  },
  ergonomics: {
    label: 'Ergonomics',
    note: 'Keep posture happy while the hustle runs long hours.'
  },
  power_backup: {
    label: 'Power backup',
    note: 'Ride through outages without missing a milestone.'
  },
  studio: {
    label: 'Studio spaces',
    note: 'Build sets and stages tailored to your next shoot.'
  },
  workflow: {
    label: 'Workflow suites',
    note: 'Coordinate publishing calendars and creative rituals.'
  },
  automation: {
    label: 'Automation',
    note: 'Let bots and partners handle the repetitive hustle.'
  },
  cloud_compute: {
    label: 'Cloud compute',
    note: 'Provision serious horsepower for software launches.'
  },
  edge_network: {
    label: 'Edge network',
    note: 'Beam snappy responses worldwide with low-latency magic.'
  },
  commerce_network: {
    label: 'Commerce alliances',
    note: 'Bundle storefronts, partners, and licensing deals into one push.'
  },
  consumable: {
    label: 'Daily boosts',
    note: 'Single-day treats that top up focus right when you need it.'
  }
};

const ASSET_GROUP_NOTES = {
  Foundation: 'Steady launchpads that bankroll the rest of your ventureverse.',
  Creative: 'Audience magnets that shimmer with story, art, and charisma.',
  Commerce: 'Commerce engines that keep carts chiming and partners smiling.',
  Tech: 'High-powered systems with upkeep, but outrageous reach when fueled.'
};

const ASSET_GROUP_ICONS = {
  Foundation: '🏗️',
  Creative: '🎨',
  Commerce: '🛍️',
  Tech: '🚀'
};

function formatLabelFromKey(id, fallback = 'Special') {
  if (!id) return fallback;
  return (
    id
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, match => match.toUpperCase())
      .trim() || fallback
  );
}

export function getAssetGroupLabel(definition) {
  return definition?.tag?.label || 'Special';
}

export function getAssetGroupId(definition) {
  const label = getAssetGroupLabel(definition);
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function getAssetGroupNote(label) {
  return ASSET_GROUP_NOTES[label] || 'Bundle kindred builds together to compare potential at a glance.';
}

export function describeAssetCardSummary(definition) {
  const copy = definition.cardSummary || definition.summary || definition.description;
  if (!copy) return '';
  const trimmed = copy.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}...`;
}

export function formatInstanceUpkeep(definition) {
  if (!definition) return '';
  const maintenance = definition.maintenance || {};
  const hours = Number(maintenance.hours) || 0;
  const cost = Number(maintenance.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return parts.join(' • ');
}

export function describeAssetLaunchAvailability(definition, state = getState()) {
  if (!definition) {
    return { disabled: true, reasons: ['Definition missing.'], hours: 0, cost: 0 };
  }

  const reasons = [];
  const requirementsMet = assetRequirementsMetById(definition.id, state);
  if (!requirementsMet) {
    const descriptors = listAssetRequirementDescriptors(definition, state).filter(desc => !desc.met);
    if (descriptors.length) {
      const names = descriptors.map(desc => desc.label).join(', ');
      reasons.push(`Requires ${names}`);
    } else {
      const label = formatAssetRequirementLabel(definition.id, state);
      if (label) {
        reasons.push(label);
      }
    }
  }

  const baseHours = Number(definition.setup?.hoursPerDay) || 0;
  const effect = getAssetEffectMultiplier(definition, 'setup_time_mult', { actionType: 'setup' });
  const multiplier = Number.isFinite(effect?.multiplier) ? effect.multiplier : 1;
  const hours = baseHours > 0 ? baseHours * multiplier : 0;
  if (hours > 0 && state.timeLeft < hours) {
    reasons.push(`Need ${formatHours(hours)} free (have ${formatHours(state.timeLeft)})`);
  }

  const cost = Number(definition.setup?.cost) || 0;
  if (cost > 0 && state.money < cost) {
    reasons.push(`Need $${formatMoney(cost)} (have $${formatMoney(Math.max(0, Math.floor(state.money)))})`);
  }

  return { disabled: reasons.length > 0, reasons, hours, cost };
}

export function getUpgradeCategory(definition) {
  return definition?.category || 'misc';
}

export function getUpgradeFamily(definition) {
  return definition?.family || 'general';
}

export function getCategoryCopy(id) {
  if (UPGRADE_CATEGORY_COPY[id]) {
    return UPGRADE_CATEGORY_COPY[id];
  }
  const label = formatLabelFromKey(id, 'Special');
  return {
    label,
    title: `${label} upgrades`,
    note: 'Specialized boosters that defy tidy labels.'
  };
}

export function getFamilyCopy(id) {
  if (!id) {
    return UPGRADE_FAMILY_COPY.general;
  }
  if (UPGRADE_FAMILY_COPY[id]) {
    return UPGRADE_FAMILY_COPY[id];
  }
  return {
    label: formatLabelFromKey(id, 'Highlights'),
    note: 'Specialized enhancements for this progression lane.'
  };
}

export function buildUpgradeCategories(definitions) {
  const grouped = new Map();
  definitions.forEach(definition => {
    const categoryId = getUpgradeCategory(definition);
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, new Map());
    }
    const families = grouped.get(categoryId);
    const familyId = getUpgradeFamily(definition);
    if (!families.has(familyId)) {
      families.set(familyId, []);
    }
    families.get(familyId).push(definition);
  });

  const seen = new Set();
  const orderedKeys = [
    ...UPGRADE_CATEGORY_ORDER,
    ...Array.from(grouped.keys()).filter(key => !UPGRADE_CATEGORY_ORDER.includes(key))
  ];

  return orderedKeys
    .filter(key => {
      if (seen.has(key) || !grouped.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(id => {
      const families = Array.from(grouped.get(id)?.entries() || []).map(([familyId, defs]) => ({
        id: familyId,
        copy: getFamilyCopy(familyId),
        definitions: defs
      }));
      families.sort((a, b) => a.copy.label.localeCompare(b.copy.label, undefined, { sensitivity: 'base' }));
      const total = families.reduce((sum, family) => sum + family.definitions.length, 0);
      return {
        id,
        copy: getCategoryCopy(id),
        families,
        total
      };
    });
}

export function getUpgradeSnapshot(definition, state = getState()) {
  const upgradeState = state?.upgrades?.[definition.id] || {};
  const cost = Number(definition.cost) || 0;
  const money = Number(state?.money) || 0;
  const affordable = cost <= 0 || money >= cost;
  const disabled = typeof definition.action?.disabled === 'function'
    ? definition.action.disabled(state)
    : Boolean(definition.action?.disabled);
  const purchased = Boolean(upgradeState.purchased);
  const ready = !purchased && affordable && !disabled;
  return {
    cost,
    affordable,
    disabled,
    name: definition.name || definition.id,
    purchased,
    ready
  };
}

export function describeUpgradeStatus({ purchased, ready, affordable, disabled }) {
  if (purchased) return 'Owned and active';
  if (ready) return 'Ready to launch';
  if (disabled) return 'Requires prerequisites';
  if (!affordable) return 'Save up to unlock';
  return 'Progress for this soon';
}

export function buildSkillRewards(trackId) {
  const reward = KNOWLEDGE_REWARDS[trackId];
  if (!reward) {
    return { xp: 0, skills: [] };
  }
  const xp = Number.isFinite(Number(reward.baseXp)) ? Number(reward.baseXp) : 0;
  const normalized = normalizeSkillList(reward.skills);
  const skills = normalized.map(entry => {
    const definition = getSkillDefinition(entry.id);
    return {
      id: entry.id,
      name: definition?.name || entry.id,
      weight: Number(entry.weight) || 0
    };
  });
  return { xp, skills };
}

export function resolveTrack(definition) {
  if (!definition) {
    return {
      id: '',
      name: '',
      summary: '',
      description: '',
      days: 1,
      hoursPerDay: 1,
      tuition: 0,
      action: null,
      skillXp: 0,
      skills: []
    };
  }

  const canonicalId = definition.studyTrackId || definition.id;
  const canonical = KNOWLEDGE_TRACKS[canonicalId];
  const skillRewards = buildSkillRewards(canonical?.id || canonicalId);

  const summary = definition.description || canonical?.description || '';
  const description = canonical?.description || definition.description || '';
  const days = Number(canonical?.days ?? definition.days ?? definition.action?.durationDays) || 1;
  const hoursPerDay = Number(
    canonical?.hoursPerDay ?? definition.hoursPerDay ?? definition.time ?? definition.action?.timeCost
  ) || 1;
  const tuition = Number(canonical?.tuition ?? definition.tuition ?? definition.action?.moneyCost) || 0;

  return {
    id: canonical?.id || canonicalId,
    name: canonical?.name || definition.name || canonicalId,
    summary,
    description,
    days,
    hoursPerDay,
    tuition,
    action: definition.action,
    skillXp: skillRewards.xp,
    skills: skillRewards.skills
  };
}

export function buildHustleModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    describeRequirements = describeHustleRequirements,
    getUsage = getHustleDailyUsage,
    formatHours: formatHoursFn = formatHours,
    formatMoney: formatMoneyFn = formatMoney
  } = helpers;

  const state = getStateFn();

  return definitions.map(definition => {
    const time = Number(definition.time || definition.action?.timeCost) || 0;
    const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
    const roi = time > 0 ? payout / time : payout;
    const searchPieces = [definition.name, definition.description].filter(Boolean).join(' ');
    const search = searchPieces.toLowerCase();

    const requirements = (describeRequirements?.(definition, state) || []).map(req => ({ ...req }));
    const requirementSummary = requirements.length
      ? requirements.map(req => `${req.label} ${req.met ? '✓' : '•'}`).join('  ')
      : 'No requirements';

    const usage = getUsage?.(definition, state) || null;
    const limitSummary = usage
      ? usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Daily limit reached for today. Resets tomorrow.'
      : '';

    const actionDisabled = definition.action
      ? typeof definition.action.disabled === 'function'
        ? definition.action.disabled(state)
        : Boolean(definition.action.disabled)
      : true;

    const actionLabel = definition.action
      ? typeof definition.action.label === 'function'
        ? definition.action.label(state)
        : definition.action.label || 'Queue'
      : '';

    const badges = [`${formatHoursFn(time)} time`];
    if (payout > 0) {
      badges.push(`$${formatMoneyFn(payout)} payout`);
    }
    if (definition.tag?.label) {
      badges.push(definition.tag.label);
    }

    return {
      id: definition.id,
      name: definition.name || definition.id,
      description: definition.description || '',
      tag: definition.tag || null,
      metrics: {
        time: { value: time, label: formatHoursFn(time) },
        payout: { value: payout, label: payout > 0 ? `$${formatMoneyFn(payout)}` : '' },
        roi
      },
      badges,
      requirements: {
        summary: requirementSummary,
        items: requirements
      },
      limit: usage
        ? {
            ...usage,
            summary: limitSummary,
            exhausted: usage.remaining <= 0
          }
        : null,
      action: definition.action
        ? {
            label: actionLabel,
            disabled: actionDisabled,
            className: definition.action.className || 'primary'
          }
        : null,
      available: !actionDisabled,
      filters: {
        search,
        time,
        payout,
        roi,
        available: !actionDisabled,
        limitRemaining: usage ? usage.remaining : null,
        tag: definition.tag?.label || ''
      }
    };
  });
}

export function buildAssetModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    getAssetState: getAssetStateFn = getAssetState
  } = helpers;

  const state = getStateFn();
  const groups = new Map();
  const launchers = [];

  definitions.forEach(definition => {
    const groupId = getAssetGroupId(definition);
    const label = getAssetGroupLabel(definition);
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label,
        note: getAssetGroupNote(label),
        icon: ASSET_GROUP_ICONS[label] || '✨',
        definitions: [],
        instances: []
      });
    }
    const entry = groups.get(groupId);
    entry.definitions.push({
      id: definition.id,
      name: definition.name || definition.id,
      summary: describeAssetCardSummary(definition),
      definition
    });

    const assetState = getAssetStateFn(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      const status = instance.status === 'active' ? 'active' : 'setup';
      const needsMaintenance = status === 'active' && !instance.maintenanceFundedToday;
      const nicheId = typeof instance.nicheId === 'string' ? instance.nicheId : null;
      entry.instances.push({
        definitionId: definition.id,
        id: instance.id,
        index,
        status,
        needsMaintenance,
        nicheId,
        risk: definition.tag?.type === 'advanced' ? 'high' : 'medium',
        filters: {
          group: groupId,
          status,
          needsMaintenance,
          niche: nicheId,
          risk: definition.tag?.type === 'advanced' ? 'high' : 'medium'
        },
        definition,
        instance: instance || null
      });
    });

    if (definition.action) {
      const availability = describeAssetLaunchAvailability(definition, state);
      const labelText = typeof definition.action.label === 'function'
        ? definition.action.label(state)
        : definition.action.label || `Launch ${definition.singular || definition.name || 'venture'}`;
      launchers.push({
        id: definition.id,
        name: definition.name || definition.id,
        summary: describeAssetCardSummary(definition),
        setup: {
          days: Number(definition.setup?.days) || 0,
          hoursPerDay: Number(definition.setup?.hoursPerDay) || 0,
          cost: Number(definition.setup?.cost) || 0
        },
        upkeep: formatInstanceUpkeep(definition),
        action: {
          label: labelText,
          disabled: availability.disabled,
          reasons: availability.reasons,
          hours: availability.hours,
          cost: availability.cost,
          className: definition.action.className || 'primary',
          onClick: typeof definition.action.onClick === 'function' ? definition.action.onClick : null
        },
        filters: {
          group: groupId,
          tag: definition.tag?.type || 'general'
        },
        singular: definition.singular || 'Passive venture',
        definition
      });
    }
  });

  return {
    groups: Array.from(groups.values()),
    launchers
  };
}

export function buildUpgradeModels(definitions = [], helpers = {}) {
  const { getState: getStateFn = getState } = helpers;
  const state = getStateFn();
  const categories = buildUpgradeCategories(definitions).map(category => ({
    ...category,
    families: category.families.map(family => ({
      ...family,
      definitions: family.definitions.map(definition => {
        const snapshot = getUpgradeSnapshot(definition, state);
        const searchPieces = [definition.name, definition.description, definition.tag?.label]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return {
          id: definition.id,
          name: definition.name || definition.id,
          description: definition.description || '',
          tag: definition.tag || null,
          cost: Number(definition.cost) || 0,
          snapshot,
          filters: {
            category: category.id,
            family: family.id,
            search: searchPieces,
            ready: snapshot.ready,
            affordable: snapshot.affordable
          }
        };
      })
    }))
  }));

  const stats = definitions.reduce(
    (acc, definition) => {
      const snapshot = getUpgradeSnapshot(definition, state);
      if (snapshot.purchased) acc.purchased += 1;
      if (snapshot.ready) acc.ready += 1;
      acc.total += 1;
      return acc;
    },
    { purchased: 0, ready: 0, total: 0 }
  );

  return {
    categories,
    overview: {
      ...stats,
      note: describeOverviewNote(stats)
    }
  };
}

function describeOverviewNote({ total, purchased, ready }) {
  if (!total) {
    return 'Upgrades unlock as you build new assets and story beats.';
  }
  if (total === purchased) {
    return 'Every upgrade is owned! Keep stacking cash for the next content drop.';
  }
  if (ready > 0) {
    return ready === 1
      ? 'One upgrade is ready to install right now.'
      : `${ready} upgrades are ready to install right now.`;
  }
  return 'Meet the prerequisites or save up to line up your next power spike.';
}

export function buildEducationModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    getKnowledgeProgress: getKnowledgeProgressFn = getKnowledgeProgress,
    getTimeCap: getTimeCapFn = getTimeCap
  } = helpers;

  const state = getStateFn();
  const tracks = definitions.map(definition => {
    const info = resolveTrack(definition);
    const progress = getKnowledgeProgressFn(info.id, state) || {};
    const active = Boolean(progress.enrolled && !progress.completed);
    const completed = Boolean(progress.completed);
    return {
      definitionId: definition.id,
      id: info.id,
      name: info.name,
      summary: info.summary,
      description: info.description,
      days: info.days,
      hoursPerDay: info.hoursPerDay,
      tuition: info.tuition,
      skillXp: info.skillXp,
      skills: info.skills,
      progress: {
        enrolled: Boolean(progress.enrolled),
        completed,
        studiedToday: Boolean(progress.studiedToday),
        daysCompleted: Number(progress.daysCompleted) || 0,
        totalDays: Number(progress.totalDays ?? info.days) || info.days
      },
      action: info.action
        ? {
            label: typeof info.action.label === 'function' ? info.action.label(state) : info.action.label || 'Study',
            disabled: typeof info.action.disabled === 'function' ? info.action.disabled(state) : Boolean(info.action.disabled)
          }
        : null,
      filters: {
        active,
        completed,
        track: info.id
      }
    };
  });

  const queueEntries = tracks.filter(track => track.progress.enrolled && !track.progress.completed);
  const totalHours = queueEntries.reduce((sum, track) => sum + track.hoursPerDay, 0);
  const capHours = state ? getTimeCapFn(state) : 0;

  return {
    tracks,
    queue: {
      entries: queueEntries.map(track => ({ id: track.id, name: track.name, hoursPerDay: track.hoursPerDay })),
      totalHours,
      totalLabel: `Total ETA: ${formatHours(totalHours)}`,
      capHours,
      capLabel: `Daily cap: ${formatHours(capHours)}`
    }
  };
}

function toCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildPulseSummary(summary = {}) {
  const entries = [];
  const passiveBreakdown = ensureArray(summary.passiveBreakdown);
  const offlinePortion = passiveBreakdown
    .filter(entry => entry?.stream === 'offline')
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  const passiveOnly = Math.max(0, toCurrency(summary.passiveEarnings) - offlinePortion);
  const active = toCurrency(summary.activeEarnings);
  if (active > 0) {
    entries.push({ id: 'active', label: 'Active', amount: active, direction: 'in', icon: '💼' });
  }
  if (passiveOnly > 0) {
    entries.push({ id: 'passive', label: 'Passive', amount: passiveOnly, direction: 'in', icon: '🌙' });
  }
  if (offlinePortion > 0) {
    entries.push({ id: 'offline', label: 'Offline', amount: offlinePortion, direction: 'in', icon: '🛰️' });
  }

  const upkeep = toCurrency(summary.upkeepSpend);
  if (upkeep > 0) {
    entries.push({ id: 'upkeep', label: 'Upkeep', amount: upkeep, direction: 'out', icon: '⚙️' });
  }

  const tuitionSpend = ensureArray(summary.spendBreakdown)
    .filter(entry => typeof entry?.key === 'string' && entry.key.includes(':tuition'))
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  if (tuitionSpend > 0) {
    entries.push({ id: 'tuition', label: 'Tuition', amount: tuitionSpend, direction: 'out', icon: '🎓' });
  }

  const otherSpend = Math.max(0, toCurrency(summary.totalSpend) - upkeep - tuitionSpend);
  if (otherSpend > 0) {
    entries.push({ id: 'investments', label: 'Invest', amount: otherSpend, direction: 'out', icon: '🚀' });
  }

  return entries;
}

function formatSourceNote(source) {
  if (!source || typeof source !== 'object') return '';
  const count = Number(source.count);
  const name = source.name || source.label || '';
  if (!Number.isFinite(count) || count <= 0 || !name) return name || '';
  return `${count} ${name}${count === 1 ? '' : 's'}`;
}

function buildInflowLedger(summary = {}) {
  const groups = new Map();

  function pushEntry(groupId, groupLabel, icon, entry) {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label: groupLabel,
        icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(groupId);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Income',
      amount,
      note: formatSourceNote(entry?.source) || ''
    });
  }

  ensureArray(summary.earningsBreakdown).forEach(entry => {
    pushEntry('active', 'Active Hustles', '💼', entry);
  });

  ensureArray(summary.passiveBreakdown).forEach(entry => {
    const stream = entry?.stream === 'offline' ? 'offline' : 'passive';
    const label = stream === 'offline' ? 'Offline Windfalls' : 'Passive Streams';
    const icon = stream === 'offline' ? '🛰️' : '🌙';
    pushEntry(stream, label, icon, entry);
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

const SPEND_CATEGORY_META = {
  maintenance: { id: 'maintenance', label: 'Upkeep', icon: '⚙️' },
  payroll: { id: 'payroll', label: 'Payroll', icon: '🤖' },
  investment: { id: 'investment', label: 'Investments', icon: '🚀' },
  setup: { id: 'setup', label: 'Setup', icon: '🛠️' },
  upgrade: { id: 'upgrade', label: 'Upgrades', icon: '⬆️' },
  consumable: { id: 'consumable', label: 'Boosts', icon: '☕' },
  tuition: { id: 'tuition', label: 'Tuition', icon: '🎓' }
};

function resolveSpendCategory(entry = {}) {
  if (typeof entry?.key === 'string' && entry.key.includes(':tuition')) {
    return SPEND_CATEGORY_META.tuition;
  }
  const category = String(entry?.category || '').split(':')[0];
  if (SPEND_CATEGORY_META[category]) {
    return SPEND_CATEGORY_META[category];
  }
  return { id: 'other', label: 'Other', icon: '📉' };
}

function buildOutflowLedger(summary = {}) {
  const groups = new Map();

  ensureArray(summary.spendBreakdown).forEach(entry => {
    const meta = resolveSpendCategory(entry);
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(meta.id)) {
      groups.set(meta.id, {
        id: meta.id,
        label: meta.label,
        icon: meta.icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(meta.id);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Spending',
      amount,
      note: entry?.definition?.category || entry?.category || ''
    });
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

function computeTopEarner(summary = {}) {
  const pools = [
    ...ensureArray(summary.earningsBreakdown),
    ...ensureArray(summary.passiveBreakdown)
  ];
  let top = null;
  pools.forEach(entry => {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!top || amount > top.amount) {
      top = {
        label: entry?.label || entry?.definition?.label || 'Top earner',
        amount,
        stream: entry?.stream || entry?.category || 'income'
      };
    }
  });
  return top;
}

function collectUnfundedUpkeep(assetDefinitions = [], state) {
  let total = 0;
  let count = 0;
  const entries = [];

  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active' || instance.maintenanceFundedToday) return;
      const cost = Math.max(0, Number(definition.maintenance?.cost) || 0);
      if (cost <= 0) return;
      total += cost;
      count += 1;
      entries.push({
        id: instance.id,
        label: instanceLabel(definition, index),
        amount: toCurrency(cost)
      });
    });
  });

  return { total: toCurrency(total), count, entries };
}

function collectTuitionCommitments(educationDefinitions = [], state) {
  const entries = [];

  educationDefinitions.forEach(definition => {
    const track = resolveTrack(definition);
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled || progress.completed) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewards(track.id);
    const skillNames = ensureArray(rewards.skills).map(skill => skill.name).filter(Boolean);
    const bonusParts = [];
    if (rewards.xp > 0) {
      bonusParts.push(`${rewards.xp} XP`);
    }
    if (skillNames.length) {
      bonusParts.push(`Boosts: ${skillNames.join(', ')}`);
    }
    entries.push({
      id: track.id,
      name: track.name,
      tuition: toCurrency(track.tuition),
      remainingDays,
      totalDays: track.days,
      hoursPerDay: track.hoursPerDay,
      studiedToday: Boolean(progress.studiedToday),
      bonus: bonusParts.join(' • ') || track.summary
    });
  });

  const total = entries.reduce((sum, entry) => sum + entry.tuition, 0);
  return { total: toCurrency(total), entries };
}

function buildObligations(state, assetDefinitions = [], educationDefinitions = [], helpers = {}) {
  const upkeep = collectUnfundedUpkeep(assetDefinitions, state);
  const assistantCountFn = helpers.getAssistantCount || getAssistantCount;
  const assistantDailyCostFn = helpers.getAssistantDailyCost || getAssistantDailyCost;
  const assistants = Math.max(0, Number(assistantCountFn(state)) || 0);
  const payroll = toCurrency(assistantDailyCostFn(state));
  const tuition = collectTuitionCommitments(educationDefinitions, state);

  const entries = [];
  entries.push({
    id: 'upkeep',
    label: 'Unfunded upkeep',
    amount: upkeep.total,
    note: upkeep.count > 0 ? `${upkeep.count} asset${upkeep.count === 1 ? '' : 's'} waiting` : 'All assets covered',
    items: upkeep.entries
  });
  entries.push({
    id: 'payroll',
    label: 'Assistant payroll',
    amount: payroll,
    note: assistants > 0 ? `${assistants} assistant${assistants === 1 ? '' : 's'} on staff` : 'No assistants hired'
  });
  entries.push({
    id: 'tuition',
    label: 'Study commitments',
    amount: tuition.total,
    note: tuition.entries.length
      ? `${tuition.entries.length} active course${tuition.entries.length === 1 ? '' : 's'}`
      : 'No tuition in progress',
    items: tuition.entries
  });

  const actionable = entries.filter(entry => entry.amount > 0);
  const quick = actionable.length
    ? actionable.sort((a, b) => b.amount - a.amount)[0]
    : { id: 'clear', label: 'All obligations covered', amount: 0, note: 'Nothing urgent' };

  return { entries, quick };
}

function buildPendingIncome(assetDefinitions = [], state) {
  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      const pending = toCurrency(instance?.pendingIncome);
      if (pending <= 0) return;
      const breakdownEntries = ensureArray(instance?.lastIncomeBreakdown?.entries).map(entry => ({
        label: entry?.label || 'Modifier',
        amount: toCurrency(entry?.amount)
      }));
      entries.push({
        id: instance.id,
        assetId: definition.id,
        label: instanceLabel(definition, index),
        assetName: definition.singular || definition.name || definition.id,
        amount: pending,
        breakdown: breakdownEntries
      });
    });
  });
  return entries.sort((a, b) => b.amount - a.amount);
}

function buildAssetPerformance(assetDefinitions = [], state) {
  const currentDay = Math.max(1, Number(state?.day) || 1);
  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active') return;
      const created = Math.max(1, Number(instance.createdOnDay) || currentDay);
      const daysActive = Math.max(1, currentDay - created + 1);
      const average = toCurrency(instance.totalIncome / daysActive);
      const latest = toCurrency(instance.lastIncome);
      const upkeep = toCurrency(Number(definition.maintenance?.cost) || 0);
      const saleValue = toCurrency(calculateAssetSalePrice(instance));
      entries.push({
        id: instance.id,
        assetId: definition.id,
        label: instanceLabel(definition, index),
        assetName: definition.singular || definition.name || definition.id,
        average,
        latest,
        upkeep,
        saleValue
      });
    });
  });
  return entries.sort((a, b) => b.average - a.average);
}

function buildAssetOpportunities(assetDefinitions = [], state) {
  return assetDefinitions.map(definition => {
    const availability = describeAssetLaunchAvailability(definition, state);
    const setupDays = Number(definition.setup?.days) || 0;
    const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
    const totalHours = toCurrency(setupDays * hoursPerDay);
    const payoutRange = getDailyIncomeRange(definition);
    return {
      id: definition.id,
      name: definition.name || definition.id,
      cost: toCurrency(definition.setup?.cost || 0),
      ready: !availability.disabled,
      reasons: availability.reasons || [],
      setup: {
        days: setupDays,
        hoursPerDay,
        totalHours
      },
      payoutRange: {
        min: toCurrency(payoutRange?.min),
        max: toCurrency(payoutRange?.max)
      }
    };
  }).sort((a, b) => a.cost - b.cost);
}

function buildUpgradeOpportunities(upgradeDefinitions = [], state) {
  return upgradeDefinitions.map(definition => {
    const snapshot = getUpgradeSnapshot(definition, state);
    return {
      id: definition.id,
      name: definition.name || definition.id,
      cost: toCurrency(snapshot.cost),
      ready: snapshot.ready,
      purchased: snapshot.purchased,
      affordable: snapshot.affordable,
      description: definition.description || ''
    };
  }).sort((a, b) => a.cost - b.cost);
}

function buildHustleOpportunities(hustleDefinitions = [], state) {
  return hustleDefinitions
    .map(definition => {
      const time = Number(definition.time || definition.action?.timeCost) || 0;
      const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
      const roi = time > 0 ? payout / time : payout;
      const requirements = (describeHustleRequirements?.(definition, state) || []).map(req => ({
        label: req.label,
        met: req.met
      }));
      return {
        id: definition.id,
        name: definition.name || definition.id,
        time,
        payout,
        roi,
        requirements
      };
    })
    .sort((a, b) => b.roi - a.roi);
}

function buildOpportunitySummary(assets, upgrades, hustles) {
  return {
    assets,
    upgrades,
    hustles
  };
}

function buildEducationInvestmentsForBank(educationDefinitions = [], state) {
  const entries = [];
  educationDefinitions.forEach(definition => {
    const track = resolveTrack(definition);
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewards(track.id);
    const skillNames = ensureArray(rewards.skills).map(skill => skill.name).filter(Boolean);
    const bonusParts = [];
    if (rewards.xp > 0) {
      bonusParts.push(`${rewards.xp} XP`);
    }
    if (skillNames.length) {
      bonusParts.push(skillNames.join(', '));
    }
    entries.push({
      id: track.id,
      name: track.name,
      tuition: toCurrency(track.tuition),
      remainingDays,
      totalDays: track.days,
      hoursPerDay: track.hoursPerDay,
      studiedToday: Boolean(progress.studiedToday),
      bonus: bonusParts.join(' • ') || track.summary
    });
  });
  return entries.sort((a, b) => a.remainingDays - b.remainingDays);
}

export function buildFinanceModel(registries = {}, helpers = {}) {
  const { getState: getStateFn = getState } = helpers;
  const state = getStateFn();
  if (!state) {
    return {
      header: null,
      ledger: { inflows: [], outflows: [] },
      obligations: { entries: [], quick: null },
      pendingIncome: [],
      assetPerformance: [],
      opportunities: buildOpportunitySummary([], [], []),
      education: [],
      summary: null
    };
  }

  const summary = computeDailySummary(state);
  const assetDefinitions = Array.isArray(registries?.assets) ? registries.assets : getAssets();
  const upgradeDefinitions = Array.isArray(registries?.upgrades) ? registries.upgrades : getUpgrades();
  const hustleDefinitions = Array.isArray(registries?.hustles) ? registries.hustles : getHustles();
  const educationDefinitions = Array.isArray(registries?.education) ? registries.education : [];

  const inflows = buildInflowLedger(summary);
  const outflows = buildOutflowLedger(summary);
  const obligations = buildObligations(state, assetDefinitions, educationDefinitions, helpers);
  const pendingIncome = buildPendingIncome(assetDefinitions, state);
  const assetPerformance = buildAssetPerformance(assetDefinitions, state);
  const opportunities = buildOpportunitySummary(
    buildAssetOpportunities(assetDefinitions, state),
    buildUpgradeOpportunities(upgradeDefinitions, state),
    buildHustleOpportunities(hustleDefinitions, state)
  );
  const educationInvestments = buildEducationInvestmentsForBank(educationDefinitions, state);
  const pulse = buildPulseSummary(summary);
  const topEarner = computeTopEarner(summary);

  const header = {
    cashOnHand: toCurrency(state.money),
    netDaily: toCurrency(summary.totalEarnings - summary.totalSpend),
    lifetimeEarned: toCurrency(state.totals?.earned),
    lifetimeSpent: toCurrency(state.totals?.spent),
    pulse,
    quickObligation: obligations.quick,
    topEarner
  };

  const meta = header.netDaily !== 0
    ? `${header.netDaily >= 0 ? '+' : '-'}$${formatMoney(Math.abs(header.netDaily))} net today`
    : 'Cashflow steady today';

  return {
    header,
    ledger: { inflows, outflows },
    obligations,
    pendingIncome,
    assetPerformance,
    opportunities,
    education: educationInvestments,
    summary: { meta }
  };
}

