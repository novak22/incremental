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

export function buildAssetGroups(definitions = [], state = getState()) {
  const groups = new Map();
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
    entry.definitions.push(definition);
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      entry.instances.push({ definition, instance, index });
    });
  });
  return Array.from(groups.values());
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
      summary: describeAssetCardSummary(definition)
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
        }
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
          className: definition.action.className || 'primary'
        },
        filters: {
          group: groupId,
          tag: definition.tag?.type || 'general'
        }
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

export {
  UPGRADE_CATEGORY_ORDER,
  UPGRADE_CATEGORY_COPY,
  UPGRADE_FAMILY_COPY,
  ASSET_GROUP_NOTES,
  ASSET_GROUP_ICONS
};
