import { createId, formatHours, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { getHustleState, getState } from '../core/state.js';
import { addMoney, spendMoney } from './currency.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { spendTime } from './time.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress, markKnowledgeStudied } from './requirements.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from './metrics.js';

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
    name: track.name,
    tag: { label: 'Study', type: 'study' },
    description: track.description,
    details: [
      () => `⏳ Time: <strong>${formatHours(track.hoursPerDay)}</strong>`,
      () => {
        const progress = getKnowledgeProgress(track.id);
        const status = progress.completed ? 'Complete' : `${progress.daysCompleted}/${track.days} days`;
        return `📚 Progress: <strong>${status}</strong>`;
      }
    ],
    action: {
      label: () => {
        const progress = getKnowledgeProgress(track.id);
        if (progress.completed) return 'Course Complete';
        if (progress.studiedToday) return 'Studied Today';
        return 'Study Today';
      },
      className: 'secondary',
      disabled: () => {
        const state = getState();
        const progress = getKnowledgeProgress(track.id);
        if (progress.completed || progress.studiedToday) return true;
        return state.timeLeft < track.hoursPerDay;
      },
      onClick: () => {
        executeAction(() => {
          const state = getState();
          const progress = getKnowledgeProgress(track.id);
          if (progress.completed || progress.studiedToday) return;
          if (state.timeLeft < track.hoursPerDay) {
            addLog('You need more free hours to study today.', 'warning');
            return;
          }
          spendTime(track.hoursPerDay);
          recordTimeContribution({
            key: `study:${track.id}:time`,
            label: `📘 ${track.name} study`,
            hours: track.hoursPerDay,
            category: 'study'
          });
          markKnowledgeStudied(track.id);
          addLog(`You invested ${formatHours(track.hoursPerDay)} studying ${track.name}.`, 'info');
        });
        checkDayEnd();
      }
    },
    cardState: (_state, card) => {
      if (!card) return;
      const progress = getKnowledgeProgress(track.id);
      card.classList.toggle('completed', progress.completed);
      const inProgress = progress.daysCompleted > 0 || progress.studiedToday;
      card.dataset.inProgress = inProgress ? 'true' : 'false';
      card.dataset.studiedToday = progress.studiedToday ? 'true' : 'false';
    }
  }));
}
