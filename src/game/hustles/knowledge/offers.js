import { ensureDailyOffersForDay } from '../marketAccess.js';
import { getAvailableOffers } from '../market.js';
import { structuredClone } from '../../../core/helpers.js';
import { getTrackDefinitionId } from './utils.js';

export function resolveMarketSnapshot(track, state) {
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
  const upcoming =
    offers
      .filter(candidate => candidate.availableOnDay > currentDay)
      .sort((a, b) => a.availableOnDay - b.availableOnDay)[0] || null;

  return { offer, upcoming };
}

export function buildStudyMarketConfig(track) {
  const tuition = Number(track.tuition) || 0;
  const seatPolicy = tuition > 0 ? 'limited' : 'always-on';
  const baseMetadata = {
    templateCategory: 'study',
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
    category: 'study',
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
}
