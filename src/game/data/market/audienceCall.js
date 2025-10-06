import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'community',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 3,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Host the Q&A stream',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'audience-flash',
      label: 'Flash AMA',
      description: 'Stage a quick Q&A for superfans during the lunch break rush.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Host the flash AMA'
    }),
    ({ hours }) => buildVariant({
      id: 'audience-series',
      label: 'Mini Workshop Series',
      description: 'Break a dense topic into two cozy livestreams with downloadable extras.',
      durationDays: 1,
      payoutAmount: 25,
      hoursRequired: hours * 2,
      hoursPerDay: hours,
      daysRequired: 2,
      progressLabel: 'Run the mini workshop series'
    }),
    ({ hours }) => buildVariant({
      id: 'audience-cohort',
      label: 'Community Coaching Cohort',
      description: 'Coach a private cohort through deep-dive Q&A sessions across the week.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 55,
      hoursRequired: hours * 4,
      hoursPerDay: hours * 1.5,
      daysRequired: 3,
      progressLabel: 'Coach the cohort Q&A'
    })
  ]
};
