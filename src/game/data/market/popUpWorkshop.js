import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'education',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 4,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Teach the workshop curriculum',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'workshop-evening',
      label: 'Evening Intensive',
      description: 'Host a single-evening crash course with a lively Q&A finale.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Run the evening intensive'
    }),
    ({ hours }) => buildVariant({
      id: 'workshop-weekend',
      label: 'Weekend Cohort',
      description: 'Stretch the curriculum into a cozy two-day cohort with templates and recaps.',
      durationDays: 1,
      payoutAmount: 80,
      hoursRequired: 5,
      hoursPerDay: hours,
      daysRequired: 2,
      progressLabel: 'Guide the weekend workshop'
    }),
    () => buildVariant({
      id: 'workshop-coaching',
      label: 'Mentor Track',
      description: 'Pair teaching with asynchronous feedback and office hours across the week.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 130,
      hoursRequired: 8,
      hoursPerDay: 2,
      daysRequired: 4,
      progressLabel: 'Mentor the workshop cohort'
    })
  ]
};
