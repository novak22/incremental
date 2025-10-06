import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'writing',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 4,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Write the commissioned piece',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'freelance-rush',
      label: 'Same-Day Draft',
      description: 'Turn a trending request into a polished rush article before the news cycle flips.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Draft the rush article'
    }),
    ({ hours }) => buildVariant({
      id: 'freelance-series',
      label: 'Three-Part Mini Series',
      description: 'Outline, draft, and polish a three-installment story arc for a premium client.',
      durationDays: 2,
      payoutAmount: 55,
      hoursRequired: hours * 3,
      hoursPerDay: hours,
      daysRequired: 3,
      progressLabel: 'Outline and polish the mini-series'
    }),
    ({ hours }) => buildVariant({
      id: 'freelance-retainer',
      label: 'Weekly Retainer Columns',
      description: 'Keep a subscriber base buzzing with a full week of evergreen columns.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 85,
      hoursRequired: hours * 4,
      hoursPerDay: hours,
      daysRequired: 4,
      progressLabel: 'Deliver the retainer lineup'
    })
  ]
};
