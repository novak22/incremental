import knowledgeTrackData from '../requirements/data/knowledgeTracks.js';
import { formatDays, formatHours, formatMoney, structuredClone } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { enrollInKnowledgeTrack, getKnowledgeProgress } from '../requirements.js';
import { describeTrackEducationBonuses } from '../educationEffects.js';
import { ensureDailyOffersForDay, getAvailableOffers } from '../hustles.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;

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

        const durationDays = tuition > 0 ? 0 : 30;

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
