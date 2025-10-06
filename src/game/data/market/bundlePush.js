import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'marketing',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 3,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Bundle the featured offer',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'bundle-flash',
      label: 'Flash Sale Blast',
      description: 'Pair blog hits with a one-day bonus bundle and shout it across every channel.',
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Run the flash sale blast'
    }),
    ({ hours }) => buildVariant({
      id: 'bundle-roadshow',
      label: 'Cross-Promo Roadshow',
      description: 'Spin up a three-day partner push with curated bundles for every audience segment.',
      durationDays: 2,
      payoutAmount: 120,
      hoursRequired: hours * 2.4,
      hoursPerDay: 2,
      daysRequired: 3,
      progressLabel: 'Host the cross-promo roadshow'
    }),
    ({ hours }) => buildVariant({
      id: 'bundle-evergreen',
      label: 'Evergreen Funnel Revamp',
      description: 'Refine the evergreen funnel, swap testimonials, and refresh every automated upsell.',
      availableAfterDays: 1,
      durationDays: 4,
      payoutAmount: 250,
      hoursRequired: hours * 5,
      hoursPerDay: hours,
      daysRequired: 5,
      progressLabel: 'Optimize the evergreen funnel'
    })
  ]
};
