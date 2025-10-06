import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'events',
  seats: 1,
  slotsPerRoll: 1,
  maxActive: 2,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Shoot the event gallery',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'photo-pop',
      label: 'Pop-Up Shoot',
      description: 'Capture a lively pop-up showcase with a single-day gallery sprint.',
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Deliver the pop-up gallery'
    }),
    () => buildVariant({
      id: 'photo-weekender',
      label: 'Weekend Retainer',
      description: 'Cover a two-day festival run with daily highlight reels and VIP portraits.',
      durationDays: 2,
      payoutAmount: 195,
      hoursRequired: 9,
      hoursPerDay: 3,
      daysRequired: 3,
      progressLabel: 'Cover the weekend retainer'
    }),
    () => buildVariant({
      id: 'photo-tour',
      label: 'Tour Documentary',
      description: 'Shadow a headliner for a full tour stop, from rehearsals to encore edits.',
      availableAfterDays: 1,
      durationDays: 4,
      payoutAmount: 325,
      hoursRequired: 15,
      hoursPerDay: 3,
      daysRequired: 5,
      progressLabel: 'Produce the tour documentary set'
    })
  ]
};
