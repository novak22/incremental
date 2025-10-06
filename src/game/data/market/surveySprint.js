import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'research',
  seats: 1,
  slotsPerRoll: 3,
  maxActive: 5,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Complete the survey dash',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'survey-burst',
      label: 'Coffee Break Survey',
      description: 'Grab a quick stipend for a single micro feedback burst.',
      copies: 3,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Complete the coffee break survey'
    }),
    () => buildVariant({
      id: 'survey-panel',
      label: 'Panel Follow-Up',
      description: 'Call past respondents for layered follow-up insights over two evenings.',
      copies: 2,
      durationDays: 1,
      payoutAmount: 5,
      hoursRequired: 1,
      hoursPerDay: 0.5,
      daysRequired: 2,
      progressLabel: 'Handle the panel follow-up'
    }),
    () => buildVariant({
      id: 'survey-report',
      label: 'Insights Report Sprint',
      description: 'Compile responses into a polished insights deck for premium subscribers.',
      availableAfterDays: 1,
      durationDays: 2,
      payoutAmount: 10,
      hoursRequired: 2.25,
      hoursPerDay: 0.75,
      daysRequired: 3,
      progressLabel: 'Compile the survey report'
    })
  ]
};
