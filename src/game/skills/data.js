export const SKILL_DEFINITIONS = [
  {
    id: 'writing',
    name: 'Writing & Storycraft',
    description: 'Shaping outlines, drafting chapters, and polishing prose that spark curiosity.'
  },
  {
    id: 'audience',
    name: 'Audience Engagement & Teaching',
    description: 'Hosting workshops, gathering feedback, and nurturing loyal communities.'
  },
  {
    id: 'promotion',
    name: 'Promotion & Funnel Strategy',
    description: 'Designing campaigns, optimizing funnels, and amplifying launches.'
  },
  {
    id: 'research',
    name: 'Market Research & Analytics',
    description: 'Spotting opportunities, running surveys, and decoding buyer behavior.'
  },
  {
    id: 'visual',
    name: 'Visual Production',
    description: 'Framing shots, directing sets, and capturing striking visuals.'
  },
  {
    id: 'editing',
    name: 'Editing & Post-Production',
    description: 'Cutting footage, balancing audio, and polishing deliverables to shine.'
  },
  {
    id: 'commerce',
    name: 'Commerce Operations & Fulfillment',
    description: 'Managing listings, packing orders, and delighting customers at scale.'
  },
  {
    id: 'software',
    name: 'Software Development & Automation',
    description: 'Coding features, taming bugs, and automating workflows.'
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure & Reliability',
    description: 'Scaling systems, hardening uptime, and keeping services humming.'
  },
  {
    id: 'audio',
    name: 'Audio Production & Performance',
    description: 'Crafting voiceovers, narrations, and sonic experiences that resonate.'
  }
];

export const SKILL_LEVELS = [
  { level: 0, xp: 0, title: 'Novice' },
  { level: 1, xp: 100, title: 'Apprentice' },
  { level: 2, xp: 300, title: 'Specialist' },
  { level: 3, xp: 700, title: 'Expert' },
  { level: 4, xp: 1200, title: 'Master' }
];

export const CHARACTER_LEVELS = [
  { level: 1, xp: 0, title: 'Rising Creator' },
  { level: 2, xp: 300, title: 'Seasoned Builder' },
  { level: 3, xp: 750, title: 'Momentum Maven' },
  { level: 4, xp: 1400, title: 'Visionary Strategist' },
  { level: 5, xp: 2200, title: 'Trailblazing Icon' }
];

const SKILL_ID_SET = new Set(SKILL_DEFINITIONS.map(skill => skill.id));

export function getSkillDefinition(id) {
  return SKILL_DEFINITIONS.find(skill => skill.id === id) || null;
}

export function calculateSkillLevel(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let level = 0;
  for (const tier of SKILL_LEVELS) {
    if (value >= tier.xp) {
      level = tier.level;
    } else {
      break;
    }
  }
  return level;
}

export function calculateCharacterLevel(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (const tier of CHARACTER_LEVELS) {
    if (value >= tier.xp) {
      level = tier.level;
    } else {
      break;
    }
  }
  return level;
}

export function createEmptySkillState() {
  return SKILL_DEFINITIONS.reduce((map, skill) => {
    map[skill.id] = { xp: 0, level: 0 };
    return map;
  }, {});
}

export function normalizeSkillState(existing = {}) {
  const normalized = createEmptySkillState();
  for (const skill of SKILL_DEFINITIONS) {
    const stored = existing[skill.id] || {};
    const xp = Math.max(0, Number(stored.xp) || 0);
    normalized[skill.id] = {
      xp,
      level: calculateSkillLevel(xp)
    };
  }
  return normalized;
}

export function createEmptyCharacterState() {
  return { xp: 0, level: 1 };
}

export function normalizeCharacterState(existing = {}) {
  const xp = Math.max(0, Number(existing.xp) || 0);
  return {
    xp,
    level: calculateCharacterLevel(xp)
  };
}

export function normalizeSkillList(skills = []) {
  const order = new Map();
  const weights = new Map();

  skills.forEach((entry, index) => {
    if (!entry) return;
    let id = null;
    let weight = 1;

    if (typeof entry === 'string') {
      id = entry;
    } else if (typeof entry === 'object') {
      id = entry.id || entry.skillId || null;
      if (Number.isFinite(Number(entry.weight))) {
        weight = Number(entry.weight);
      } else if (Number.isFinite(Number(entry.multiplier))) {
        weight = Number(entry.multiplier);
      }
    }

    if (!id || !SKILL_ID_SET.has(id)) return;
    if (!Number.isFinite(weight) || weight <= 0) return;

    if (!order.has(id)) {
      order.set(id, order.size + index / 1000);
    }
    weights.set(id, (weights.get(id) || 0) + weight);
  });

  return Array.from(weights.entries())
    .sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
    .map(([id, weight]) => ({ id, weight }));
}
