import { getState } from '../../../core/state.js';
import { formatLabelFromKey } from '../utils.js';

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

function getUpgradeCategory(definition) {
  return definition?.category || 'misc';
}

function getUpgradeFamily(definition) {
  return definition?.family || 'general';
}

function getCategoryCopy(id) {
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

function getFamilyCopy(id) {
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

function buildUpgradeCategories(definitions) {
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

function buildUpgradeModels(definitions = [], helpers = {}) {
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

export default buildUpgradeModels;
