import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'logistics',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 4,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Pack the surprise boxes',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'dropship-flash-pack',
      label: 'Flash Pack Party',
      description: 'Bundle overnight orders with handwritten notes and confetti slips.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Handle the flash pack party'
    }),
    () => buildVariant({
      id: 'dropship-weekender',
      label: 'Weekend Fulfillment Surge',
      description: 'Keep the warehouse humming through a two-day influencer spotlight.',
      durationDays: 1,
      payoutAmount: 75,
      hoursRequired: 5,
      hoursPerDay: 2.5,
      daysRequired: 2,
      progressLabel: 'Handle the weekend surge'
    }),
    () => buildVariant({
      id: 'dropship-subscription',
      label: 'Subscription Box Assembly',
      description: 'Assemble a full month of subscription boxes with premium inserts and QA.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 145,
      hoursRequired: 10,
      hoursPerDay: 2.5,
      daysRequired: 4,
      progressLabel: 'Bundle the subscription shipment'
    })
  ]
};
