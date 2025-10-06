import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'audio',
  seats: 1,
  slotsPerRoll: 1,
  maxActive: 2,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Narrate the featured chapter',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'audiobook-sample',
      label: 'Sample Chapter Session',
      description: 'Record a standout sample chapter with layered ambience and polish.',
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Cut the sample session'
    }),
    () => buildVariant({
      id: 'audiobook-volume',
      label: 'Featured Volume Marathon',
      description: 'Deliver two feature chapters with bonus pickups and breath edits.',
      durationDays: 1,
      payoutAmount: 85,
      hoursRequired: 5,
      hoursPerDay: 2.5,
      daysRequired: 2,
      progressLabel: 'Record the featured volume'
    }),
    () => buildVariant({
      id: 'audiobook-series',
      label: 'Series Finale Production',
      description: 'Narrate the season finale arc with retakes, engineering, and QC notes.',
      availableAfterDays: 1,
      durationDays: 4,
      payoutAmount: 210,
      hoursRequired: 12.5,
      hoursPerDay: 2.5,
      daysRequired: 5,
      progressLabel: 'Deliver the full series finale'
    })
  ]
};
