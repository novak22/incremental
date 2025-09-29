import { formatList } from '../../core/helpers.js';
import { getState } from '../../core/state.js';

const NICHE_VARIANCE = 0.15;
const POPULARITY_MIN = 0.5;
const POPULARITY_MAX = 1.5;

const NICHE_OPTIONS = [
  {
    id: 'cozy_lifestyle',
    name: 'Cozy Lifestyle',
    description: 'Warm routines, productivity rituals, and feel-good self-care inspo.'
  },
  {
    id: 'tech_tinkering',
    name: 'Tech Tinkering',
    description: 'Gadgets, automation experiments, and snappy code walkthroughs.'
  },
  {
    id: 'indie_creator',
    name: 'Indie Creator Diaries',
    description: 'Behind-the-scenes launches, storytelling tips, and creative courage.'
  },
  {
    id: 'mindful_money',
    name: 'Mindful Money',
    description: 'Budget glow-ups, ethical investing, and gentle finance coaching.'
  },
  {
    id: 'adventure_micro',
    name: 'Micro Adventures',
    description: 'Weekend getaways, city quests, and playful local discoveries.'
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureNicheContainer(target) {
  if (!target.niches || typeof target.niches !== 'object') {
    target.niches = {};
  }
  NICHE_OPTIONS.forEach(option => {
    if (!target.niches[option.id]) {
      target.niches[option.id] = {
        popularity: 1
      };
    } else if (!Number.isFinite(Number(target.niches[option.id].popularity))) {
      target.niches[option.id].popularity = 1;
    }
  });
  return target.niches;
}

export function ensureNicheState(target = getState()) {
  if (!target) return null;
  return ensureNicheContainer(target);
}

export function getNicheOptions() {
  return [...NICHE_OPTIONS];
}

export function isValidNicheId(nicheId) {
  return NICHE_OPTIONS.some(option => option.id === nicheId);
}

export function getNicheById(nicheId) {
  return NICHE_OPTIONS.find(option => option.id === nicheId) || null;
}

export function getNichePopularity(nicheId, target = getState()) {
  const nicheState = ensureNicheState(target)?.[nicheId];
  if (!nicheState) return 1;
  const value = Number(nicheState.popularity);
  return Number.isFinite(value) ? value : 1;
}

export function getTrendingNiches(limit = 3, target = getState()) {
  const entries = ensureNicheState(target);
  if (!entries) return [];
  return NICHE_OPTIONS
    .map(option => ({
      ...option,
      popularity: getNichePopularity(option.id, target)
    }))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, Math.max(0, limit));
}

export function describePopularity(popularity) {
  const percent = Math.round(popularity * 100);
  if (percent >= 115) return `${percent}% — on fire!`;
  if (percent >= 105) return `${percent}% — trending up`;
  if (percent <= 85) return `${percent}% — cooling off`;
  if (percent <= 95) return `${percent}% — a little quiet`;
  return `${percent}% — steady`;
}

export function randomizeNichePopularity(target = getState()) {
  const entries = ensureNicheState(target);
  if (!entries) return [];
  const changes = [];
  NICHE_OPTIONS.forEach(option => {
    const current = getNichePopularity(option.id, target);
    const roll = Math.random();
    const delta = (roll * 2 - 1) * NICHE_VARIANCE;
    const next = clamp(current * (1 + delta), POPULARITY_MIN, POPULARITY_MAX);
    entries[option.id].popularity = Number(next.toFixed(4));
    changes.push({
      id: option.id,
      name: option.name,
      previous: current,
      next,
      change: next - current
    });
  });
  return changes;
}

export function summarizeNicheTrends(changes = []) {
  if (!changes.length) return null;
  const sorted = [...changes].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const highlights = sorted.slice(0, 2);
  const summaries = highlights.map(item => {
    const direction = item.change >= 0 ? 'up' : 'down';
    const percent = Math.round(Math.abs(item.change) * 100);
    return `${item.name} swung ${direction} ${percent}% (now ${Math.round(item.next * 100)}%)`;
  });
  if (!summaries.length) return null;
  return `Trend tracker: ${formatList(summaries)}.`;
}

export function getInstanceNiche(instance) {
  if (!instance?.niche || !isValidNicheId(instance.niche)) return null;
  const option = getNicheById(instance.niche);
  if (!option) return null;
  return {
    ...option,
    popularity: getNichePopularity(option.id)
  };
}
