import { createId, formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import {
  getAssetDefinition,
  getAssetState,
  getHustleDefinition,
  getHustleState,
  getState
} from '../core/state.js';
import { executeAction } from './actions.js';
import { addMoney } from './currency.js';
import { checkDayEnd } from './lifecycle.js';
import { createInstantHustle } from './content/schema.js';
import {
  KNOWLEDGE_TRACKS,
  enrollInKnowledgeTrack,
  getKnowledgeProgress
} from './requirements.js';
import { recordPayoutContribution } from './metrics.js';

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

function countActiveAssets(assetId, state = getState()) {
  const assetState = getAssetState(assetId, state);
  if (!assetState?.instances) return 0;
  return assetState.instances.filter(instance => instance.status === 'active').length;
}

function requirementsMet(requirements = [], state = getState()) {
  if (!requirements?.length) return true;
  return requirements.every(req => countActiveAssets(req.assetId, state) >= (Number(req.count) || 1));
}

function renderRequirementSummary(requirements = [], state = getState()) {
  if (!requirements.length) return 'None';
  return requirements
    .map(req => {
      const definition = getAssetDefinition(req.assetId);
      const label = definition?.singular || definition?.name || req.assetId;
      const need = Number(req.count) || 1;
      const have = countActiveAssets(req.assetId, state);
      return `${label}: ${have}/${need} active`;
    })
    .join(' • ');
}

export function getHustleRequirements(definition) {
  if (!definition) return [];
  return Array.isArray(definition.requirements) ? definition.requirements : [];
}

export function describeHustleRequirements(definition, state = getState()) {
  const requirements = getHustleRequirements(definition);
  if (!requirements.length) return [];
  return requirements.map(req => {
    const assetDefinition = getAssetDefinition(req.assetId);
    const label = assetDefinition?.singular || assetDefinition?.name || req.assetId;
    const need = Number(req.count) || 1;
    const have = countActiveAssets(req.assetId, state);
    return {
      type: 'asset',
      assetId: req.assetId,
      label: `${need} ${label}${need === 1 ? '' : 's'}`,
      met: have >= need,
      progress: { have, need }
    };
  });
}

export function areHustleRequirementsMet(definition, state = getState()) {
  return requirementsMet(getHustleRequirements(definition), state);
}

const freelanceWriting = createInstantHustle({
  id: 'freelance',
  name: 'Freelance Writing',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
  time: 2,
  payout: {
    amount: 18,
    logType: 'hustle',
    message: () => 'You hustled an article for $18. Not Pulitzer material, but it pays the bills!'
  },
  metrics: {
    time: { label: '⚡ Freelance writing time', category: 'hustle' },
    payout: { label: '💼 Freelance writing payout', category: 'hustle' }
  },
  actionLabel: 'Write Now'
});

const audienceCall = createInstantHustle({
  id: 'audienceCall',
  name: 'Audience Q&A Blast',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Host a 60-minute livestream for your blog readers and pitch a premium checklist.',
  time: 1,
  requirements: AUDIENCE_CALL_REQUIREMENTS,
  payout: {
    amount: 12,
    logType: 'hustle',
    message: () => 'Your audience Q&A tipped $12 in template sales. Small wins add up!'
  },
  metrics: {
    time: { label: '🎤 Audience Q&A prep', category: 'hustle' },
    payout: { label: '🎤 Audience Q&A payout', category: 'hustle' }
  },
  actionLabel: 'Go Live'
});

const bundlePush = createInstantHustle({
  id: 'bundlePush',
  name: 'Bundle Promo Push',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Pair your top blogs with an e-book bonus bundle for a limited-time flash sale.',
  time: 2.5,
  requirements: BUNDLE_PUSH_REQUIREMENTS,
  payout: {
    amount: 48,
    logType: 'hustle',
    message: () => 'Your flash bundle moved $48 in upsells. Subscribers love the combo!'
  },
  metrics: {
    time: { label: '🧺 Bundle promo planning', category: 'hustle' },
    payout: { label: '🧺 Bundle promo payout', category: 'hustle' }
  },
  actionLabel: 'Launch Bundle'
});

const surveySprint = createInstantHustle({
  id: 'surveySprint',
  name: 'Micro Survey Dash',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Knock out a 15-minute feedback survey while your coffee is still warm.',
  time: 0.25,
  payout: {
    amount: 1,
    logType: 'hustle',
    message: () => 'You breezed through a micro survey for $1. It all counts toward the dream!'
  },
  metrics: {
    time: { label: '📝 Survey dash time', category: 'hustle' },
    payout: { label: '🪙 Survey dash payout', category: 'hustle' }
  },
  actionLabel: 'Start Survey'
});

const eventPhotoGig = createInstantHustle({
  id: 'eventPhotoGig',
  name: 'Event Photo Gig',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Grab your gallery gear and capture candid magic at a pop-up showcase.',
  time: 3.5,
  requirements: EVENT_PHOTO_REQUIREMENTS,
  payout: {
    amount: 72,
    logType: 'hustle',
    message: () => 'Your lenses caught the event buzz! $72 in photo packages just dropped.'
  },
  metrics: {
    time: { label: '📸 Event shoot time', category: 'hustle' },
    payout: { label: '📸 Event shoot payout', category: 'hustle' }
  },
  actionLabel: 'Pack the Camera Bag'
});

const popUpWorkshop = createInstantHustle({
  id: 'popUpWorkshop',
  name: 'Pop-Up Workshop',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Host a cozy crash course that blends your blog insights with e-book handouts.',
  time: 2.5,
  requirements: WORKSHOP_REQUIREMENTS,
  payout: {
    amount: 38,
    logType: 'hustle',
    message: () => 'Your pop-up workshop wrapped with $38 in sign-ups and smiling grads.'
  },
  metrics: {
    time: { label: '🎓 Workshop facilitation', category: 'hustle' },
    payout: { label: '🎓 Workshop payout', category: 'hustle' }
  },
  actionLabel: 'Set the Agenda'
});

const vlogEditRush = createInstantHustle({
  id: 'vlogEditRush',
  name: 'Vlog Edit Rush',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Slice, color, and caption a backlog vlog episode for a partner channel.',
  time: 1.5,
  requirements: EDIT_RUSH_REQUIREMENTS,
  payout: {
    amount: 24,
    logType: 'hustle',
    message: () => 'You polished a collab vlog for $24. Their subscribers are already bingeing!'
  },
  metrics: {
    time: { label: '🎬 Vlog edit time', category: 'hustle' },
    payout: { label: '🎬 Vlog edit payout', category: 'hustle' }
  },
  actionLabel: 'Launch Edit Sprint'
});

const dropshipPackParty = createInstantHustle({
  id: 'dropshipPackParty',
  name: 'Dropship Pack Party',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Bundle hot orders with branded tissue paper and a confetti of thank-you notes.',
  time: 2,
  cost: 8,
  requirements: PACK_PARTY_REQUIREMENTS,
  payout: {
    amount: 28,
    logType: 'hustle',
    message: () => 'Packing party complete! $28 cleared after shipping labels and sparkle tape.'
  },
  metrics: {
    time: { label: '📦 Packing party time', category: 'hustle' },
    cost: { label: '📦 Packing party supplies', category: 'investment' },
    payout: { label: '📦 Packing party payout', category: 'hustle' }
  },
  actionLabel: 'Queue Shipments'
});

const saasBugSquash = createInstantHustle({
  id: 'saasBugSquash',
  name: 'SaaS Bug Squash',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Dig through error logs and deploy a patch before support tickets pile up.',
  time: 1,
  requirements: BUG_SQUASH_REQUIREMENTS,
  payout: {
    amount: 30,
    logType: 'hustle',
    message: () => 'Customers cheered your hotfix! $30 in retention credits landed instantly.'
  },
  metrics: {
    time: { label: '🧰 Bug fix time', category: 'hustle' },
    payout: { label: '🧰 Bug fix payout', category: 'hustle' }
  },
  actionLabel: 'Patch the Glitch'
});

const audiobookNarration = createInstantHustle({
  id: 'audiobookNarration',
  name: 'Audiobook Narration',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Record a silky-smooth sample chapter to hype your flagship e-book series.',
  time: 2.75,
  requirements: NARRATION_REQUIREMENTS,
  payout: {
    amount: 44,
    logType: 'hustle',
    message: () => 'Your narration melted ears and earned $44 in audio bundle preorders.'
  },
  metrics: {
    time: { label: '🎙️ Narration booth time', category: 'hustle' },
    payout: { label: '🎙️ Narration payout', category: 'hustle' }
  },
  actionLabel: 'Warm Up Vocals'
});

const streetPromoSprint = createInstantHustle({
  id: 'streetPromoSprint',
  name: 'Street Team Promo',
  tag: { label: 'Instant', type: 'instant' },
  description: 'Hand out QR stickers at a pop-up market to funnel readers toward your latest drops.',
  time: 0.75,
  cost: 5,
  requirements: STREET_PROMO_REQUIREMENTS,
  payout: {
    amount: 18,
    logType: 'hustle',
    message: () => 'Your sticker swarm paid off! $18 in rush sales chimed in on the go.'
  },
  metrics: {
    time: { label: '🚀 Street promo time', category: 'hustle' },
    cost: { label: '🚀 Street promo stickers', category: 'investment' },
    payout: { label: '🚀 Street promo payout', category: 'hustle' }
  },
  actionLabel: 'Deploy Street Team'
});

const flips = createInstantHustle({
  id: 'flips',
  name: 'eBay Flips',
  tag: { label: 'Delayed', type: 'delayed' },
  description: 'Hunt for deals, flip them online. Profit arrives fashionably late.',
  time: 4,
  cost: 20,
  payout: {
    amount: 48,
    delaySeconds: 30,
    grantOnAction: false
  },
  metrics: {
    time: { label: '📦 eBay flips prep', category: 'hustle' },
    cost: { label: '💸 eBay flips sourcing', category: 'investment' },
    payout: { label: '💼 eBay flips payout', category: 'delayed' }
  },
  defaultState: {
    pending: []
  },
  actionLabel: 'Start Flip',
  onExecute: context => {
    context.skipDefaultPayout();
    scheduleFlip();
    addLog('You listed a spicy eBay flip. In 30 seconds it should cha-ching for $48!', 'delayed');
  }
});

flips.extraContent = card => {
  const status = document.createElement('div');
  status.className = 'pending';
  status.textContent = 'No flips in progress.';
  card.appendChild(status);
  return { status };
};

flips.update = (_state, ui) => {
  updateFlipStatus(ui.extra.status);
};

flips.process = (now, offline) => processFlipPayouts(now, offline);

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
  flips,
  ...createKnowledgeHustles()
];

export function scheduleFlip() {
  const flipState = getHustleState('flips');
  flipState.pending.push({
    id: createId(),
    readyAt: Date.now() + 30000,
    payout: 48
  });
}

export function updateFlipStatus(element) {
  if (!element) return;
  const flipState = getHustleState('flips');
  if (!flipState.pending.length) {
    element.textContent = 'No flips in progress.';
    return;
  }
  const now = Date.now();
  const nextFlip = flipState.pending.reduce((soonest, flip) => (flip.readyAt < soonest.readyAt ? flip : soonest));
  const timeRemaining = Math.max(0, Math.round((nextFlip.readyAt - now) / 1000));
  const label = timeRemaining === 0 ? 'any moment' : `${timeRemaining}s`;
  const descriptor = flipState.pending.length === 1 ? 'flip' : 'flips';
  element.textContent = `${flipState.pending.length} ${descriptor} in progress. Next payout in ${label}.`;
}

export function processFlipPayouts(now = Date.now(), offline = false) {
  const state = getState();
  if (!state) return { changed: false };
  const flipState = getHustleState('flips');
  if (!flipState.pending.length) {
    return { changed: false };
  }

  const remaining = [];
  let completed = 0;
  let offlineTotal = 0;

  for (const flip of flipState.pending) {
    if (flip.readyAt <= now) {
      completed += 1;
      if (offline) {
        state.money += flip.payout;
        offlineTotal += flip.payout;
        recordHustlePayout('flips', {
          label: '💼 eBay flips payout',
          amount: flip.payout,
          category: 'offline'
        });
      } else {
        addMoney(flip.payout, `Your eBay flip sold for $${formatMoney(flip.payout)}! Shipping label time.`, 'delayed');
        recordHustlePayout('flips', {
          label: '💼 eBay flips payout',
          amount: flip.payout,
          category: 'delayed'
        });
      }
    } else {
      remaining.push(flip);
    }
  }

  flipState.pending = remaining;

  if (!completed) {
    return { changed: false };
  }

  const result = { changed: true };
  if (offline && offlineTotal > 0) {
    result.offlineLog = {
      message: `While you were away, ${completed} eBay ${completed === 1 ? 'flip' : 'flips'} paid out. $${formatMoney(
        offlineTotal
      )} richer!`,
      type: 'delayed'
    };
  }
  return result;
}

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
      }
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
