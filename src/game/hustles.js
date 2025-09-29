import { formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { countActiveAssetInstances, getAssetDefinition, getHustleDefinition, getState } from '../core/state.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { createInstantHustle } from './content/schema.js';
import {
  KNOWLEDGE_TRACKS,
  enrollInKnowledgeTrack,
  getKnowledgeProgress,
  summarizeAssetRequirements
} from './requirements.js';
import { recordPayoutContribution } from './metrics.js';
import { describeTrackEducationBonuses } from './educationEffects.js';

const AUDIENCE_CALL_REQUIREMENTS = [{ assetId: 'blog', count: 1 }];
const BUNDLE_PUSH_REQUIREMENTS = [
  { assetId: 'blog', count: 2 },
  { assetId: 'ebook', count: 1 }
];
const EVENT_PHOTO_REQUIREMENTS = [{ assetId: 'stockPhotos', count: 1 }];
const WORKSHOP_REQUIREMENTS = [
  { assetId: 'blog', count: 1 },
  { assetId: 'ebook', count: 1 }
];
const EDIT_RUSH_REQUIREMENTS = [{ assetId: 'vlog', count: 1 }];
const PACK_PARTY_REQUIREMENTS = [{ assetId: 'dropshipping', count: 1 }];
const BUG_SQUASH_REQUIREMENTS = [{ assetId: 'saas', count: 1 }];
const NARRATION_REQUIREMENTS = [{ assetId: 'ebook', count: 1 }];
const STREET_PROMO_REQUIREMENTS = [{ assetId: 'blog', count: 2 }];

function extractMetricKey(metric) {
  if (!metric) return null;
  if (typeof metric === 'string') return metric;
  if (typeof metric === 'object') return metric.key || null;
  return null;
}

function getHustleMetricIds(hustleId) {
  const definition = getHustleDefinition(hustleId);
  if (!definition) return {};
  const actionMetrics = definition.action?.metricIds || definition.action?.metrics || {};
  const definitionMetrics = definition.metricIds || definition.metrics || {};
  return {
    time: extractMetricKey(actionMetrics.time) || extractMetricKey(definitionMetrics.time),
    cost: extractMetricKey(actionMetrics.cost) || extractMetricKey(definitionMetrics.cost),
    payout: extractMetricKey(actionMetrics.payout) || extractMetricKey(definitionMetrics.payout)
  };
}

function fallbackHustleMetricId(hustleId, type) {
  const suffix = type === 'payout' ? 'payout' : type;
  return `hustle:${hustleId}:${suffix}`;
}

function recordHustlePayout(hustleId, { label, amount, category }) {
  const metrics = getHustleMetricIds(hustleId);
  const key = metrics.payout || fallbackHustleMetricId(hustleId, 'payout');
  recordPayoutContribution({ key, label, amount, category });
}

function renderRequirementSummary(requirements = [], state = getState()) {
  return summarizeAssetRequirements(requirements, state);
}

export function getHustleRequirements(definition) {
  if (!definition) return [];
  return Array.isArray(definition.requirements) ? definition.requirements : [];
}

function normalizeHustleDailyUsage(definition, state = getState()) {
  if (!definition || typeof definition.getDailyUsage !== 'function') {
    const dayFromState = Number(state?.day);
    return {
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      day: Number.isFinite(dayFromState) && dayFromState > 0 ? dayFromState : 1
    };
  }

  const usage = definition.getDailyUsage(state) || {};
  const rawLimit = Number(usage.limit);
  const isLimited = Number.isFinite(rawLimit) && rawLimit > 0;
  const limit = isLimited ? rawLimit : Infinity;
  const used = Math.max(0, Number(usage.used) || 0);
  const rawRemaining = usage.remaining ?? (isLimited ? limit - used : Infinity);
  const remaining = isLimited ? Math.max(0, Number(rawRemaining)) : Infinity;
  const dayFromState = Number(state?.day);
  const dayFromUsage = Number(usage.currentDay);
  const day = Number.isFinite(dayFromState) && dayFromState > 0
    ? dayFromState
    : (Number.isFinite(dayFromUsage) && dayFromUsage > 0 ? dayFromUsage : 1);

  return { limit, used, remaining, day };
}

function describeDailyLimit(definition, state = getState()) {
  const usage = normalizeHustleDailyUsage(definition, state);
  if (!usage || !Number.isFinite(usage.limit) || usage.limit <= 0) return [];
  const { used, remaining, limit } = usage;
  return [
    {
      type: 'limit',
      label: `Daily runs left: ${remaining}/${limit}`,
      met: remaining > 0,
      progress: {
        used,
        remaining,
        limit
      }
    }
  ];
}

export function describeHustleRequirements(definition, state = getState()) {
  const requirements = getHustleRequirements(definition);
  const descriptors = requirements.map(req => {
    const assetDefinition = getAssetDefinition(req.assetId);
    const label = assetDefinition?.singular || assetDefinition?.name || req.assetId;
    const need = Number(req.count) || 1;
    const have = countActiveAssetInstances(req.assetId, state);
    return {
      type: 'asset',
      assetId: req.assetId,
      label: `${need} ${label}${need === 1 ? '' : 's'}`,
      met: have >= need,
      progress: { have, need }
    };
  });
  return [...descriptors, ...describeDailyLimit(definition, state)];
}

export function areHustleRequirementsMet(definition, state = getState()) {
  const requirements = getHustleRequirements(definition);
  const assetsMet = requirements.every(req => countActiveAssetInstances(req.assetId, state) >= (Number(req.count) || 1));
  if (!assetsMet) return false;
  const usage = normalizeHustleDailyUsage(definition, state);
  if (usage && Number.isFinite(usage.limit) && usage.limit > 0 && Math.max(0, Number(usage.remaining)) <= 0) {
    return false;
  }
  return true;
}

export function getHustleDailyUsage(definition, state = getState()) {
  const usage = normalizeHustleDailyUsage(definition, state);
  if (!usage || !Number.isFinite(usage.limit) || usage.limit <= 0) {
    return null;
  }
  const { limit, used, remaining, day } = usage;
  return { limit, used, remaining, day };
}

const freelanceWriting = createInstantHustle({
  id: 'freelance',
  name: 'Freelance Writing',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
  tags: ['writing', 'desktop_work'],
  time: 2,
  payout: {
    amount: 18,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 18;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Your storytelling drills juiced the rate!'
        : '';
      return `You hustled an article for $${formatMoney(payout)}. Not Pulitzer material, but it pays the bills!${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '⚡ Freelance writing time', category: 'hustle' },
    payout: { label: '💼 Freelance writing payout', category: 'hustle' }
  },
  skills: ['writing'],
  actionLabel: 'Write Now'
});

const audienceCall = createInstantHustle({
  id: 'audienceCall',
  name: 'Audience Q&A Blast',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Host a 60-minute livestream for your blog readers and pitch a premium checklist.',
  tags: ['community', 'live', 'video'],
  time: 1,
  requirements: AUDIENCE_CALL_REQUIREMENTS,
  dailyLimit: 1,
  payout: {
    amount: 12,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 12;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Spotlight-ready banter brought in extra tips.'
        : '';
      return `Your audience Q&A tipped $${formatMoney(payout)} in template sales. Small wins add up!${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🎤 Audience Q&A prep', category: 'hustle' },
    payout: { label: '🎤 Audience Q&A payout', category: 'hustle' }
  },
  skills: ['audience'],
  actionLabel: 'Go Live'
});

const bundlePush = createInstantHustle({
  id: 'bundlePush',
  name: 'Bundle Promo Push',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Pair your top blogs with an e-book bonus bundle for a limited-time flash sale.',
  tags: ['commerce', 'marketing'],
  time: 2.5,
  requirements: BUNDLE_PUSH_REQUIREMENTS,
  payout: {
    amount: 48,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 48;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Funnel math mastery made every upsell sparkle.'
        : '';
      return `Your flash bundle moved $${formatMoney(payout)} in upsells. Subscribers love the combo!${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🧺 Bundle promo planning', category: 'hustle' },
    payout: { label: '🧺 Bundle promo payout', category: 'hustle' }
  },
  skills: ['promotion'],
  actionLabel: 'Launch Bundle'
});

const surveySprint = createInstantHustle({
  id: 'surveySprint',
  name: 'Micro Survey Dash',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Knock out a 15-minute feedback survey while your coffee is still warm.',
  tags: ['ops', 'desktop_work'],
  time: 0.25,
  dailyLimit: 4,
  payout: {
    amount: 1,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 1;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Guerrilla research savvy bumped the stipend.'
        : '';
      return `You breezed through a micro survey for $${formatMoney(payout)}. It all counts toward the dream!${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '📝 Survey dash time', category: 'hustle' },
    payout: { label: '🪙 Survey dash payout', category: 'hustle' }
  },
  skills: ['research'],
  actionLabel: 'Start Survey'
});

const eventPhotoGig = createInstantHustle({
  id: 'eventPhotoGig',
  name: 'Event Photo Gig',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Grab your gallery gear and capture candid magic at a pop-up showcase.',
  tags: ['photo', 'shoot', 'studio'],
  time: 3.5,
  requirements: EVENT_PHOTO_REQUIREMENTS,
  payout: {
    amount: 72,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 72;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Curated portfolios impressed every client.'
        : '';
      return `Your lenses caught the event buzz! $${formatMoney(payout)} in photo packages just dropped.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '📸 Event shoot time', category: 'hustle' },
    payout: { label: '📸 Event shoot payout', category: 'hustle' }
  },
  skills: ['visual'],
  actionLabel: 'Pack the Camera Bag'
});

const popUpWorkshop = createInstantHustle({
  id: 'popUpWorkshop',
  name: 'Pop-Up Workshop',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Host a cozy crash course that blends your blog insights with e-book handouts.',
  tags: ['education', 'in_person'],
  time: 2.5,
  requirements: WORKSHOP_REQUIREMENTS,
  payout: {
    amount: 38,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 38;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Teaching polish turned browsers into buyers.'
        : '';
      return `Your pop-up workshop wrapped with $${formatMoney(payout)} in sign-ups and smiling grads.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🎓 Workshop facilitation', category: 'hustle' },
    payout: { label: '🎓 Workshop payout', category: 'hustle' }
  },
  skills: ['audience', { id: 'writing', weight: 0.5 }],
  actionLabel: 'Set the Agenda'
});

const vlogEditRush = createInstantHustle({
  id: 'vlogEditRush',
  name: 'Vlog Edit Rush',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Slice, color, and caption a backlog vlog episode for a partner channel.',
  tags: ['video', 'editing', 'desktop_work'],
  time: 1.5,
  requirements: EDIT_RUSH_REQUIREMENTS,
  payout: {
    amount: 24,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 24;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Post-production precision shaved hours off the deadline.'
        : '';
      return `You polished a collab vlog for $${formatMoney(payout)}. Their subscribers are already bingeing!${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🎬 Vlog edit time', category: 'hustle' },
    payout: { label: '🎬 Vlog edit payout', category: 'hustle' }
  },
  skills: ['editing'],
  actionLabel: 'Launch Edit Sprint'
});

const dropshipPackParty = createInstantHustle({
  id: 'dropshipPackParty',
  name: 'Dropship Pack Party',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Bundle hot orders with branded tissue paper and a confetti of thank-you notes.',
  tags: ['commerce', 'fulfillment'],
  time: 2,
  cost: 8,
  requirements: PACK_PARTY_REQUIREMENTS,
  payout: {
    amount: 28,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 28;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Logistics drills kept the conveyor humming.'
        : '';
      return `Packing party complete! $${formatMoney(payout)} cleared after shipping labels and sparkle tape.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '📦 Packing party time', category: 'hustle' },
    cost: { label: '📦 Packing party supplies', category: 'investment' },
    payout: { label: '📦 Packing party payout', category: 'hustle' }
  },
  skills: ['commerce'],
  actionLabel: 'Queue Shipments'
});

const saasBugSquash = createInstantHustle({
  id: 'saasBugSquash',
  name: 'SaaS Bug Squash',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Dig through error logs and deploy a patch before support tickets pile up.',
  tags: ['software', 'ops'],
  time: 1,
  requirements: BUG_SQUASH_REQUIREMENTS,
  payout: {
    amount: 30,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 30;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Architectural insights made debugging a breeze.'
        : '';
      return `Customers cheered your hotfix! $${formatMoney(payout)} in retention credits landed instantly.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🧰 Bug fix time', category: 'hustle' },
    payout: { label: '🧰 Bug fix payout', category: 'hustle' }
  },
  skills: ['software', { id: 'infrastructure', weight: 0.5 }],
  actionLabel: 'Patch the Glitch'
});

const audiobookNarration = createInstantHustle({
  id: 'audiobookNarration',
  name: 'Audiobook Narration',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Record a silky-smooth sample chapter to hype your flagship e-book series.',
  tags: ['audio', 'studio'],
  time: 2.75,
  requirements: NARRATION_REQUIREMENTS,
  payout: {
    amount: 44,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 44;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Narrative confidence kept the script soaring.'
        : '';
      return `Your narration melted ears and earned $${formatMoney(payout)} in audio bundle preorders.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🎙️ Narration booth time', category: 'hustle' },
    payout: { label: '🎙️ Narration payout', category: 'hustle' }
  },
  skills: ['audio'],
  actionLabel: 'Warm Up Vocals'
});

const streetPromoSprint = createInstantHustle({
  id: 'streetPromoSprint',
  name: 'Street Team Promo',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Hand out QR stickers at a pop-up market to funnel readers toward your latest drops.',
  tags: ['marketing', 'field'],
  time: 0.75,
  cost: 5,
  requirements: STREET_PROMO_REQUIREMENTS,
  payout: {
    amount: 18,
    logType: 'hustle',
    message: context => {
      const payout = context?.finalPayout ?? context?.payoutGranted ?? 18;
      const bonusNote = context?.appliedEducationBoosts?.length
        ? ' Guerrilla tactics drew a bigger crowd.'
        : '';
      return `Your sticker swarm paid off! $${formatMoney(payout)} in rush sales chimed in on the go.${bonusNote}`;
    }
  },
  metrics: {
    time: { label: '🚀 Street promo time', category: 'hustle' },
    cost: { label: '🚀 Street promo stickers', category: 'investment' },
    payout: { label: '🚀 Street promo payout', category: 'hustle' }
  },
  skills: ['promotion'],
  actionLabel: 'Deploy Street Team'
});

export const HUSTLES = [
  freelanceWriting,
  audienceCall,
  bundlePush,
  surveySprint,
  eventPhotoGig,
  popUpWorkshop,
  vlogEditRush,
  dropshipPackParty,
  saasBugSquash,
  audiobookNarration,
  streetPromoSprint,
  ...createKnowledgeHustles()
];

function createKnowledgeHustles() {
  return Object.values(KNOWLEDGE_TRACKS).map(track => ({
    id: `study-${track.id}`,
    studyTrackId: track.id,
    name: track.name,
    tag: { label: 'Study', type: 'study' },
    description: track.description,
    details: [
      () => `🎓 Tuition: <strong>$${formatMoney(track.tuition)}</strong>`,
      () => `⏳ Study Load: <strong>${formatHours(track.hoursPerDay)} / day for ${formatDays(track.days)}</strong>`,
      () => {
        const progress = getKnowledgeProgress(track.id);
        if (progress.completed) {
          return '✅ Status: <strong>Complete</strong>';
        }
        if (progress.enrolled) {
          const remaining = Math.max(0, track.days - progress.daysCompleted);
          return `📚 Status: <strong>${remaining} day${remaining === 1 ? '' : 's'} remaining</strong>`;
        }
        return '🚀 Status: <strong>Ready to enroll</strong>';
      },
      ...describeTrackEducationBonuses(track.id)
    ],
    action: {
      id: `enroll-${track.id}`,
      timeCost: 0,
      moneyCost: Number(track.tuition) || 0,
      label: () => {
        const progress = getKnowledgeProgress(track.id);
        if (progress.completed) return 'Course Complete';
        if (progress.enrolled) {
          const remaining = Math.max(0, track.days - progress.daysCompleted);
          return remaining === 0 ? 'Graduation Pending' : `${remaining} day${remaining === 1 ? '' : 's'} remaining`;
        }
        const tuition = Number(track.tuition) || 0;
        return tuition > 0 ? `Enroll for $${formatMoney(tuition)}` : 'Enroll Now';
      },
      className: 'secondary',
      disabled: () => {
        const state = getState();
        const progress = getKnowledgeProgress(track.id);
        if (progress.completed || progress.enrolled) return true;
        const tuition = Number(track.tuition) || 0;
        return tuition > 0 && state.money < tuition;
      },
      onClick: () => {
        executeAction(() => {
          const progress = getKnowledgeProgress(track.id);
          if (progress.completed || progress.enrolled) return;
          enrollInKnowledgeTrack(track.id);
        });
        checkDayEnd();
      }
    },
    cardState: (_state, card) => {
      if (!card) return;
      const progress = getKnowledgeProgress(track.id);
      card.classList.toggle('completed', progress.completed);
      const inProgress = progress.enrolled && !progress.completed;
      card.dataset.inProgress = inProgress ? 'true' : 'false';
      card.dataset.studiedToday = progress.studiedToday ? 'true' : 'false';
      card.dataset.enrolled = progress.enrolled ? 'true' : 'false';
    }
  }));
}
