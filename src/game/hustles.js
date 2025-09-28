import { createId, formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { getAssetDefinition, getAssetState, getHustleState, getState } from '../core/state.js';
import { addMoney, spendMoney } from './currency.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { spendTime } from './time.js';
import {
  KNOWLEDGE_TRACKS,
  enrollInKnowledgeTrack,
  getKnowledgeProgress
} from './requirements.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from './metrics.js';

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

const AUDIENCE_CALL_REQUIREMENTS = [{ assetId: 'blog', count: 1 }];
const BUNDLE_PUSH_REQUIREMENTS = [
  { assetId: 'blog', count: 2 },
  { assetId: 'ebook', count: 1 }
];

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

export const HUSTLES = [
  {
    id: 'freelance',
    name: 'Freelance Writing',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
    details: [
      () => '⏳ Time: <strong>2h</strong>',
      () => '💵 Payout: <strong>$18</strong>'
    ],
    action: {
      id: 'writeArticle',
      timeCost: 2,
      moneyCost: 0,
      label: 'Write Now',
      className: 'primary',
      disabled: () => getState().timeLeft < 2,
      onClick: () => {
        executeAction(() => {
          spendTime(2);
          recordTimeContribution({
            key: 'hustle:freelance:time',
            label: '⚡ Freelance writing time',
            hours: 2,
            category: 'hustle'
          });
          addMoney(18, 'You hustled an article for $18. Not Pulitzer material, but it pays the bills!');
          recordPayoutContribution({
            key: 'hustle:freelance:payout',
            label: '💼 Freelance writing payout',
            amount: 18,
            category: 'hustle'
          });
        });
        checkDayEnd();
      }
    }
  },
  {
    id: 'audienceCall',
    name: 'Audience Q&A Blast',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Host a 60-minute livestream for your blog readers and pitch a premium checklist.',
    requirements: AUDIENCE_CALL_REQUIREMENTS,
    details: [
      () => '⏳ Time: <strong>1h</strong>',
      () => '💵 Payout: <strong>$12</strong>',
      () => `Requires: <strong>${renderRequirementSummary(AUDIENCE_CALL_REQUIREMENTS)}</strong>`
    ],
    action: {
      id: 'goLive',
      timeCost: 1,
      moneyCost: 0,
      label: 'Go Live',
      className: 'primary',
      disabled: () => {
        const state = getState();
        if (!state) return true;
        if (state.timeLeft < 1) return true;
        return !requirementsMet(AUDIENCE_CALL_REQUIREMENTS, state);
      },
      onClick: () => {
        executeAction(() => {
          const state = getState();
          if (!state) return;
          if (state.timeLeft < 1) {
            addLog('You need a full free hour before going live with your readers.', 'warning');
            return;
          }
          if (!requirementsMet(AUDIENCE_CALL_REQUIREMENTS, state)) {
            addLog('You need an active blog to invite readers to that Q&A.', 'warning');
            return;
          }
          spendTime(1);
          recordTimeContribution({
            key: 'hustle:audienceCall:time',
            label: '🎤 Audience Q&A prep',
            hours: 1,
            category: 'hustle'
          });
          addMoney(12, 'Your audience Q&A tipped $12 in template sales. Small wins add up!', 'hustle');
          recordPayoutContribution({
            key: 'hustle:audienceCall:payout',
            label: '🎤 Audience Q&A payout',
            amount: 12,
            category: 'hustle'
          });
        });
        checkDayEnd();
      }
    }
  },
  {
    id: 'bundlePush',
    name: 'Bundle Promo Push',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Pair your top blogs with an e-book bonus bundle for a limited-time flash sale.',
    requirements: BUNDLE_PUSH_REQUIREMENTS,
    details: [
      () => '⏳ Time: <strong>2.5h</strong>',
      () => '💵 Payout: <strong>$48</strong>',
      () => `Requires: <strong>${renderRequirementSummary(BUNDLE_PUSH_REQUIREMENTS)}</strong>`
    ],
    action: {
      id: 'launchBundle',
      timeCost: 2.5,
      moneyCost: 0,
      label: 'Launch Bundle',
      className: 'primary',
      disabled: () => {
        const state = getState();
        if (!state) return true;
        if (state.timeLeft < 2.5) return true;
        return !requirementsMet(BUNDLE_PUSH_REQUIREMENTS, state);
      },
      onClick: () => {
        executeAction(() => {
          const state = getState();
          if (!state) return;
          if (state.timeLeft < 2.5) {
            addLog('You need 2.5 free hours to build that promo bundle.', 'warning');
            return;
          }
          if (!requirementsMet(BUNDLE_PUSH_REQUIREMENTS, state)) {
            addLog('You need two active blogs and an e-book live before that bundle will sell.', 'warning');
            return;
          }
          spendTime(2.5);
          recordTimeContribution({
            key: 'hustle:bundlePush:time',
            label: '🧺 Bundle promo planning',
            hours: 2.5,
            category: 'hustle'
          });
          addMoney(48, 'Your flash bundle moved $48 in upsells. Subscribers love the combo!', 'hustle');
          recordPayoutContribution({
            key: 'hustle:bundlePush:payout',
            label: '🧺 Bundle promo payout',
            amount: 48,
            category: 'hustle'
          });
        });
        checkDayEnd();
      }
    }
  },
  {
    id: 'flips',
    name: 'eBay Flips',
    tag: { label: 'Delayed', type: 'delayed' },
    description: 'Hunt for deals, flip them online. Profit arrives fashionably late.',
    details: [
      () => '⏳ Time: <strong>4h</strong>',
      () => '💵 Cost: <strong>$20</strong>',
      () => '💰 Payout: <strong>$48 after 30s</strong>'
    ],
    defaultState: {
      pending: []
    },
    action: {
      id: 'startFlip',
      timeCost: 4,
      moneyCost: 20,
      delaySeconds: 30,
      label: 'Start Flip',
      className: 'primary',
      disabled: () => {
        const state = getState();
        return state.timeLeft < 4 || state.money < 20;
      },
      onClick: () => {
        executeAction(() => {
          spendTime(4);
          recordTimeContribution({
            key: 'hustle:flips:time',
            label: '📦 eBay flips prep',
            hours: 4,
            category: 'hustle'
          });
          spendMoney(20);
          recordCostContribution({
            key: 'hustle:flips:cost',
            label: '💸 eBay flips sourcing',
            amount: 20,
            category: 'investment'
          });
          scheduleFlip();
          addLog('You listed a spicy eBay flip. In 30 seconds it should cha-ching for $48!', 'delayed');
        });
        checkDayEnd();
      }
    },
    extraContent: card => {
      const status = document.createElement('div');
      status.className = 'pending';
      status.textContent = 'No flips in progress.';
      card.appendChild(status);
      return { status };
    },
    update: (_state, ui) => {
      updateFlipStatus(ui.extra.status);
    },
    process: (now, offline) => processFlipPayouts(now, offline)
  },
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
  const nextFlip = flipState.pending.reduce((soonest, flip) =>
    flip.readyAt < soonest.readyAt ? flip : soonest
  );
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
      message: `While you were away, ${completed} eBay ${completed === 1 ? 'flip' : 'flips'} paid out. $${formatMoney(offlineTotal)} richer!`,
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
