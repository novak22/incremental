import knowledgeTrackData from '../requirements/data/knowledgeTracks.js';
import { formatDays, formatHours, formatMoney } from '../../core/helpers.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { enrollInKnowledgeTrack } from '../requirements.js';
import { describeTrackEducationBonuses } from '../educationEffects.js';
import { createStudyAcceptHook } from './knowledge/enrollment.js';
import { createStudyCompletionHook } from './knowledge/completion.js';
import { createKnowledgeTrackPresenter, buildTrackViewModel } from './knowledge/presenter.js';
import { buildStudyMarketConfig } from './knowledge/offers.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;

export { buildTrackViewModel };

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
        () =>
          `⏳ Study Load: <strong>${formatHours(track.hoursPerDay)} / day for ${formatDays(track.days)}</strong>`,
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
      market: buildStudyMarketConfig(track)
    };
  });
}

