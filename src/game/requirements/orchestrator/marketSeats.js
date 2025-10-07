import { formatMoney, structuredClone } from '../../../core/helpers.js';
import {
  ensureDailyOffersForDay,
  getAvailableOffers,
  getClaimedOffers,
  acceptHustleOffer,
  releaseClaimedHustleOffer
} from '../../hustles.js';

function sortByAvailableDay(a, b) {
  return (a.availableOnDay || Infinity) - (b.availableOnDay || Infinity);
}

export function createMarketSeatManager({ getState, addLog }) {
  function claimSeat({ track, tuition, currentDay, definitionId }) {
    const state = getState();
    if (!state) {
      return { success: false, reason: 'missing_state' };
    }

    ensureDailyOffersForDay({ state });

    const offers = getAvailableOffers(state, { includeUpcoming: true }).filter(offer => {
      return offer.definitionId === definitionId && offer.claimed !== true;
    });

    const availableOffer = offers
      .filter(offer => offer.availableOnDay <= currentDay)
      .sort(sortByAvailableDay)[0] || null;
    const upcomingOffer = offers
      .filter(offer => offer.availableOnDay > currentDay)
      .sort(sortByAvailableDay)[0] || null;

    if (!availableOffer) {
      if (upcomingOffer) {
        addLog(
          `${track.name} opens new seats on day ${upcomingOffer.availableOnDay}. Save the date!`,
          'info'
        );
      } else {
        addLog(`Seats for ${track.name} are booked today. Check back tomorrow!`, 'warning');
      }
      return { success: false, reason: 'no_offer' };
    }

    const metadata = structuredClone(availableOffer.metadata || {});
    const baseProgress = typeof metadata.progress === 'object' && metadata.progress !== null
      ? metadata.progress
      : {};
    const seatPolicy = metadata.seatPolicy || (tuition > 0 ? 'limited' : 'always-on');

    metadata.studyTrackId = track.id;
    metadata.trackId = track.id;
    metadata.tuitionCost = tuition;
    metadata.tuitionDue = tuition;
    metadata.educationBonuses = structuredClone(track.instantBoosts || []);
    metadata.enrolledOnDay = currentDay;
    metadata.progress = {
      ...baseProgress,
      studyTrackId: track.id,
      trackId: track.id,
      label: baseProgress.label || `Study ${track.name}`,
      completion: baseProgress.completion || 'manual'
    };
    metadata.enrollment = {
      ...(typeof metadata.enrollment === 'object' && metadata.enrollment !== null
        ? metadata.enrollment
        : {}),
      seatPolicy,
      enrolledOnDay: currentDay,
      orchestratorHandlesMessaging: true
    };

    const accepted = acceptHustleOffer({
      ...availableOffer,
      metadata
    }, { state });

    if (!accepted) {
      addLog(`Someone else snagged the last seat in ${track.name} moments before you.`, 'warning');
      return { success: false, reason: 'claim_failed' };
    }

    const acceptedMetadata = typeof accepted.metadata === 'object' && accepted.metadata !== null
      ? accepted.metadata
      : {};

    accepted.metadata = {
      ...acceptedMetadata,
      studyTrackId: track.id,
      trackId: track.id,
      tuitionCost: tuition,
      tuitionDue: tuition,
      tuitionPaid: tuition,
      tuitionPaidOnDay: currentDay,
      enrolledOnDay: currentDay,
      educationBonuses: structuredClone(track.instantBoosts || []),
      seatPolicy
    };

    accepted.metadata.progress = {
      ...(acceptedMetadata.progress || {}),
      ...metadata.progress
    };

    accepted.metadata.enrollment = {
      ...(acceptedMetadata.enrollment || {}),
      ...metadata.enrollment,
      orchestratorHandlesMessaging: true
    };

    if (tuition > 0) {
      addLog(`Reserved a seat in ${track.name} for $${formatMoney(tuition)} upfront.`, 'info');
    }

    return { success: true, offer: accepted };
  }

  function releaseSeats({ trackId, trackName, state = getState() }) {
    if (!state) {
      return { released: 0 };
    }

    const claimedStudyOffers = getClaimedOffers(state, { includeExpired: true })
      .filter(entry => entry?.metadata?.studyTrackId === trackId);

    let released = 0;
    for (const offer of claimedStudyOffers) {
      releaseClaimedHustleOffer({ offerId: offer.offerId, acceptedId: offer.id }, { state });
      released += 1;
    }

    if (released > 0) {
      const label = trackName || trackId;
      addLog(`Released ${released} ${released === 1 ? 'seat' : 'seats'} back to the market for ${label}.`, 'info');
    }

    return { released };
  }

  return {
    claimSeat,
    releaseSeats
  };
}
