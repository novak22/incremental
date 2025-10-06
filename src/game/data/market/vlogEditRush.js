import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'video',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 4,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Edit the partner episode',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'vlog-rush-cut',
      label: 'Rush Cut',
      description: 'Slice b-roll, color, and caption a single episode against a tight deadline.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Deliver the rush cut'
    }),
    ({ hours }) => buildVariant({
      id: 'vlog-batch',
      label: 'Batch Edit Package',
      description: 'Turn around two episodes with shared motion graphics and reusable transitions.',
      durationDays: 1,
      payoutAmount: 50,
      hoursRequired: 3,
      hoursPerDay: hours,
      daysRequired: 2,
      progressLabel: 'Deliver the batch edit package'
    }),
    () => buildVariant({
      id: 'vlog-season',
      label: 'Season Launch Sprint',
      description: 'Assemble opener graphics, teaser cuts, and QA for an entire mini-season.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 120,
      hoursRequired: 7,
      hoursPerDay: 1.75,
      daysRequired: 4,
      progressLabel: 'Assemble the season launch sprint'
    })
  ]
};
