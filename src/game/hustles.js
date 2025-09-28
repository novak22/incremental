import { createId, formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { getHustleState, getState } from '../core/state.js';
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
    payout: false
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

export const HUSTLES = [freelanceWriting, audienceCall, bundlePush, flips, ...createKnowledgeHustles()];

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
        recordPayoutContribution({
          key: 'hustle:flips:payout',
          label: '💼 eBay flips payout',
          amount: flip.payout,
          category: offline ? 'offline' : 'delayed'
        });
      } else {
        addMoney(flip.payout, `Your eBay flip sold for $${formatMoney(flip.payout)}! Shipping label time.`, 'delayed');
        recordPayoutContribution({
          key: 'hustle:flips:payout',
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
