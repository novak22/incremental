import knowledgeTrackData from '../requirements/data/knowledgeTracks.js';
import { formatDays, formatHours, formatMoney, structuredClone } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { addLog } from '../../core/log.js';
import { markDirty } from '../../core/events/invalidationBus.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { enrollInKnowledgeTrack, getKnowledgeProgress } from '../requirements.js';
import { describeTrackEducationBonuses } from '../educationEffects.js';
import { ensureDailyOffersForDay, getAvailableOffers } from '../hustles.js';
import { spendMoney } from '../currency.js';
import { recordCostContribution } from '../metrics.js';
import { awardSkillProgress } from '../skills/index.js';
import { KNOWLEDGE_REWARDS } from '../requirements/knowledgeTracks.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;
const STUDY_DIRTY_SECTIONS = Object.freeze(['cards', 'dashboard', 'player']);

function clampDay(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const fallbackValue = Number(fallback);
    return Number.isFinite(fallbackValue) && fallbackValue > 0 ? Math.floor(fallbackValue) : 1;
  }
  return Math.floor(parsed);
}

function ensureNestedObject(container, key) {
  if (!container || typeof container !== 'object') {
    return {};
  }
  const existing = container[key];
  if (existing && typeof existing === 'object') {
    return existing;
  }
  const created = {};
  container[key] = created;
  return created;
}

function createStudyAcceptHook(track) {
  const tuition = Math.max(0, Number(track.tuition) || 0);
  const seatPolicy = tuition > 0 ? 'limited' : 'always-on';
  return ({ state = getState(), metadata = {}, instance } = {}) => {
    const workingState = state || getState();
    if (!workingState) return;

    const acceptedDay = clampDay(instance?.acceptedOnDay, workingState.day);

    const seedMetadata = target => {
      if (!target || typeof target !== 'object') {
        return;
      }
      target.studyTrackId = track.id;
      target.trackId = track.id;
      target.tuitionCost = tuition;
      target.tuitionDue = tuition;
      target.educationBonuses = structuredClone(track.instantBoosts || []);
      const progressMetadata = ensureNestedObject(target, 'progress');
      progressMetadata.studyTrackId = track.id;
      progressMetadata.trackId = track.id;
      progressMetadata.label = progressMetadata.label || `Study ${track.name}`;
      progressMetadata.completion = progressMetadata.completion || 'manual';
      if (progressMetadata.hoursPerDay == null && track.hoursPerDay != null) {
        progressMetadata.hoursPerDay = track.hoursPerDay;
      }
      if (progressMetadata.daysRequired == null && track.days != null) {
        progressMetadata.daysRequired = track.days;
      }

      const enrollmentMetadata = ensureNestedObject(target, 'enrollment');
      enrollmentMetadata.seatPolicy = enrollmentMetadata.seatPolicy || seatPolicy;
    };

    const finalizeMetadata = target => {
      seedMetadata(target);
      if (!target || typeof target !== 'object') {
        return;
      }
      if (tuition > 0) {
        target.tuitionPaid = (Number(target.tuitionPaid) || 0) + tuition;
        target.tuitionPaidOnDay = acceptedDay;
      }
      const enrollmentMetadata = ensureNestedObject(target, 'enrollment');
      enrollmentMetadata.enrolledOnDay = acceptedDay;
    };

    const finalizeAcceptance = ({ state: finalizeState = workingState, acceptedEntry } = {}) => {
      const targetState = finalizeState || getState();
      if (!targetState) return;

      const progress = getKnowledgeProgress(track.id, targetState);

      if (tuition > 0) {
        spendMoney(tuition);
        recordCostContribution({
          key: `study:${track.id}:tuition`,
          label: `🎓 ${track.name} tuition`,
          amount: tuition,
          category: 'investment'
        });
        progress.tuitionPaid = (Number(progress.tuitionPaid) || 0) + tuition;
        progress.tuitionPaidOnDay = acceptedDay;
      }

      progress.enrolled = true;
      progress.completed = false;
      progress.enrolledOnDay = acceptedDay;
      progress.studiedToday = false;
      progress.totalDays = track.days;
      progress.hoursPerDay = track.hoursPerDay;
      progress.tuitionCost = tuition;

      finalizeMetadata(metadata);
      if (acceptedEntry && acceptedEntry.metadata) {
        finalizeMetadata(acceptedEntry.metadata);
      }

      if (instance && typeof instance === 'object') {
        if (instance.progress && typeof instance.progress === 'object') {
          instance.progress.studyTrackId = track.id;
          instance.progress.trackId = track.id;
          if (!instance.progress.label) {
            instance.progress.label = `Study ${track.name}`;
          }
          if (instance.progress.hoursPerDay == null && track.hoursPerDay != null) {
            instance.progress.hoursPerDay = track.hoursPerDay;
          }
          if (instance.progress.daysRequired == null && track.days != null) {
            instance.progress.daysRequired = track.days;
          }
        }
      }

      addLog(
        `You claimed a seat in ${track.name}! ${
          tuition > 0 ? `Tuition paid for $${formatMoney(tuition)}.` : 'No tuition due.'
        } Log ${formatHours(track.hoursPerDay)} each day from the action queue to progress.`,
        'info'
      );

      markDirty(STUDY_DIRTY_SECTIONS);

      if (instance && typeof instance === 'object') {
        delete instance.__finalizeStudyAcceptance;
        delete instance.__cancelStudyAcceptance;
      }
    };

    const cancelAcceptance = () => {
      if (instance && typeof instance === 'object') {
        delete instance.__finalizeStudyAcceptance;
        delete instance.__cancelStudyAcceptance;
      }
    };

    seedMetadata(metadata);

    if (instance && typeof instance === 'object') {
      instance.__finalizeStudyAcceptance = finalizeAcceptance;
      instance.__cancelStudyAcceptance = cancelAcceptance;
    }
  };
}

function createStudyCompletionHook(track) {
  const reward = KNOWLEDGE_REWARDS[track.id];
  return ({ state = getState(), instance } = {}) => {
    const workingState = state || getState();
    if (!workingState) return;

    const progress = getKnowledgeProgress(track.id, workingState);
    const wasCompleted = Boolean(progress.completed);

    const completionDay = clampDay(instance?.completedOnDay, workingState.day);
    const completedDays = Math.max(
      Number(instance?.progress?.daysCompleted) || 0,
      Number(progress.daysCompleted) || 0
    );

    progress.completed = true;
    progress.enrolled = false;
    progress.studiedToday = false;
    progress.totalDays = track.days;
    progress.hoursPerDay = track.hoursPerDay;
    progress.daysCompleted = Math.min(track.days, completedDays || track.days || 0);
    progress.completedOnDay = completionDay;

    if (!progress.skillRewarded) {
      if (reward) {
        const xpAwarded = awardSkillProgress({
          skills: reward.skills,
          baseXp: reward.baseXp,
          label: track.name,
          state: workingState
        });
        if (instance && xpAwarded > 0) {
          instance.skillXpAwarded = xpAwarded;
        }
      }
      progress.skillRewarded = true;
    }

    if (!wasCompleted) {
      addLog(`Finished ${track.name} after logging every session. Stellar dedication!`, 'info');
    }

    markDirty(STUDY_DIRTY_SECTIONS);
  };
}

function getTrackDefinitionId(trackId) {
  return `study-${trackId}`;
}

function resolveMarketSnapshot(track, state) {
  if (!track || !state) {
    return { offer: null, upcoming: null };
  }

  ensureDailyOffersForDay({ state });

  const definitionId = getTrackDefinitionId(track.id);
  const currentDay = Math.max(1, Math.floor(Number(state.day) || 1));
  const offers = getAvailableOffers(state, { includeUpcoming: true }).filter(candidate => {
    return candidate.definitionId === definitionId && candidate.claimed !== true;
  });

  const offer = offers.find(candidate => candidate.availableOnDay <= currentDay) || null;
  const upcoming = offers
    .filter(candidate => candidate.availableOnDay > currentDay)
    .sort((a, b) => a.availableOnDay - b.availableOnDay)[0] || null;

  return { offer, upcoming };
}

function createKnowledgeTrackPresenter(track) {
  let cachedSignature = null;
  let cachedViewModel = null;

  const compute = (state = getState()) => {
    const progress = getKnowledgeProgress(track.id, state);
    const availableMoney = Number(state?.money ?? 0);
    const { offer, upcoming } = resolveMarketSnapshot(track, state);
    const signature = [
      Number(progress.daysCompleted) || 0,
      progress.enrolled ? '1' : '0',
      progress.completed ? '1' : '0',
      progress.studiedToday ? '1' : '0',
      offer ? offer.id : 'none',
      upcoming ? upcoming.availableOnDay : 'none',
      Number.isFinite(availableMoney) ? availableMoney : 0
    ].join('|');

    if (cachedSignature !== signature) {
      cachedViewModel = buildTrackViewModel(track, state, { offer, upcoming });
      cachedSignature = signature;
    }

    return cachedViewModel;
  };

  return {
    refresh(state = getState()) {
      cachedSignature = null;
      return compute(state);
    },
    getStatusLabel(state = getState()) {
      return compute(state)?.statusLabel;
    },
    getCtaLabel(state = getState()) {
      return compute(state)?.ctaLabel;
    },
    isEnrollable(state = getState()) {
      const snapshot = compute(state);
      return Boolean(snapshot?.canEnroll);
    },
    getViewModel(state = getState()) {
      return compute(state);
    },
    getAvailabilityNote(state = getState()) {
      return compute(state)?.availabilityNote || '';
    },
    applyCardState(card, state = getState()) {
      if (!card) return;
      const snapshot = compute(state);
      if (!snapshot) return;

      const { progress, datasetFlags } = snapshot;
      card.classList.toggle('completed', Boolean(progress?.completed));
      card.dataset.inProgress = datasetFlags.inProgress ? 'true' : 'false';
      card.dataset.studiedToday = datasetFlags.studiedToday ? 'true' : 'false';
      card.dataset.enrolled = datasetFlags.enrolled ? 'true' : 'false';
      card.dataset.seatAvailable = datasetFlags.seatAvailable ? 'true' : 'false';
    }
  };
}

export function buildTrackViewModel(track, state = getState(), marketSnapshot = resolveMarketSnapshot(track, state)) {
  const progress = getKnowledgeProgress(track.id, state);
  const tuition = Number(track.tuition) || 0;
  const parsedDaysCompleted = Number(progress.daysCompleted);
  const daysCompleted = Number.isFinite(parsedDaysCompleted) ? parsedDaysCompleted : 0;
  const remainingDays = Math.max(0, Number(track.days) - daysCompleted);
  const inProgress = Boolean(progress.enrolled && !progress.completed);
  const isFree = tuition <= 0;

  const offer = marketSnapshot?.offer || null;
  const upcoming = marketSnapshot?.upcoming || null;
  const seatAvailable = Boolean(offer);

  let availabilityNote = '';
  if (progress.completed) {
    availabilityNote = '🪑 All done — diploma unlocked!';
  } else if (progress.enrolled) {
    availabilityNote = '🪑 Seat reserved — keep logging study hours.';
  } else if (seatAvailable) {
    availabilityNote = isFree
      ? '🪑 Always-on enrollment — grab a seat whenever you like.'
      : '🪑 Limited seat available today. Claim it before it disappears!';
  } else if (upcoming) {
    availabilityNote = `🪑 Next seat opens on day ${upcoming.availableOnDay}.`;
  } else {
    availabilityNote = '🪑 Seats are full today. Check back tomorrow!';
  }

  let statusLabel = '🚀 Status: <strong>Ready to enroll</strong>';
  let ctaLabel = tuition > 0 ? `Enroll for $${formatMoney(tuition)}` : 'Enroll Now';

  if (progress.completed) {
    statusLabel = '✅ Status: <strong>Complete</strong>';
    ctaLabel = 'Course Complete';
  } else if (progress.enrolled) {
    statusLabel = `📚 Status: <strong>${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining</strong>`;
    ctaLabel =
      remainingDays === 0
        ? 'Graduation Pending'
        : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`;
  }

  const availableMoney = Number(state?.money ?? 0);
  const canAfford = tuition === 0 || availableMoney >= tuition;
  const canEnroll = !progress.completed && !progress.enrolled && canAfford && seatAvailable;

  const datasetFlags = {
    inProgress,
    studiedToday: Boolean(progress.studiedToday),
    enrolled: Boolean(progress.enrolled),
    seatAvailable
  };

  return {
    progress,
    statusLabel,
    ctaLabel,
    canEnroll,
    availabilityNote,
    datasetFlags,
    offer,
    upcoming,
    tuition,
    isFree
  };
}

export function createKnowledgeHustles() {
  const orderedTracks = Object.values(KNOWLEDGE_TRACKS)
    .map((track, index) => ({ track, index }))
    .sort((a, b) => {
      const aFree = (Number(a.track.tuition) || 0) <= 0;
      const bFree = (Number(b.track.tuition) || 0) <= 0;
      if (aFree === bFree) {
        return a.index - b.index;
      }
      return aFree ? 1 : -1;
    })
    .map(entry => entry.track);

  return orderedTracks.map(track => {
    const presenter = createKnowledgeTrackPresenter(track);

    return {
      id: `study-${track.id}`,
      studyTrackId: track.id,
      name: track.name,
      tag: { label: 'Study', type: 'study' },
      description: track.description,
      defaultState: { instances: [] },
      availability: { type: 'enrollable' },
      expiry: { type: 'permanent' },
      progress: {
        type: 'study',
        completion: 'manual',
        hoursPerDay: track.hoursPerDay,
        daysRequired: track.days
      },
      details: [
        () => `🎓 Tuition: <strong>$${formatMoney(track.tuition)}</strong>`,
        () => `⏳ Study Load: <strong>${formatHours(track.hoursPerDay)} / day for ${formatDays(track.days)}</strong>`,
        () => presenter.getStatusLabel(),
        () => presenter.getAvailabilityNote(),
        ...describeTrackEducationBonuses(track.id)
      ],
      action: {
        id: `enroll-${track.id}`,
        timeCost: 0,
        moneyCost: Number(track.tuition) || 0,
        label: () => presenter.getCtaLabel(),
        className: 'secondary',
        disabled: () => !presenter.isEnrollable(),
        onClick: () => {
          executeAction(() => {
            const { canEnroll } = presenter.refresh();
            if (!canEnroll) return;
            enrollInKnowledgeTrack(track.id);
          });
          checkDayEnd();
        }
      },
      cardState: (state, card) => presenter.applyCardState(card, state),
      templateOptions: {
        accept: {
          hooks: [createStudyAcceptHook(track)]
        },
        complete: {
          hooks: [createStudyCompletionHook(track)]
        }
      },
      market: (() => {
        const tuition = Number(track.tuition) || 0;
        const seatPolicy = tuition > 0 ? 'limited' : 'always-on';
        const baseMetadata = {
          studyTrackId: track.id,
          trackId: track.id,
          tuitionCost: tuition,
          tuitionDue: tuition,
          educationBonuses: structuredClone(track.instantBoosts || []),
          progressLabel: `Study ${track.name}`,
          progress: {
            studyTrackId: track.id,
            trackId: track.id,
            label: `Study ${track.name}`,
            completion: 'manual'
          },
          seatPolicy
        };

        const limitedSeatDuration = Math.max(0, (Number(track.days) || 1) - 1);
        const durationDays = tuition > 0 ? limitedSeatDuration : 30;

        return {
          slotsPerRoll: 1,
          maxActive: 1,
          metadata: baseMetadata,
          variants: [
            {
              id: `${track.id}-default`,
              label: `${track.name} Enrollment`,
              description: track.description,
              durationDays,
              metadata: {
                ...structuredClone(baseMetadata),
                variantLabel: `${track.name} Enrollment`,
                enrollment: {
                  seatPolicy
                }
              }
            }
          ]
        };
      })()
    };
  });
}
