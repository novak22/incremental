import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'promotion',
  seats: 1,
  slotsPerRoll: 3,
  maxActive: 5,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Hit the street team route',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'street-lunch-rush',
      label: 'Lunch Rush Pop-Up',
      description: 'Drop QR stickers at the lunch market and hype a limited-time drop.',
      copies: 3,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Cover the lunch rush route'
    }),
    () => buildVariant({
      id: 'street-market',
      label: 'Night Market Takeover',
      description: 'Coordinate volunteers and signage to dominate the evening night market.',
      copies: 2,
      durationDays: 1,
      payoutAmount: 50,
      hoursRequired: 2,
      hoursPerDay: 1,
      daysRequired: 2,
      progressLabel: 'Run the night market push'
    }),
    () => buildVariant({
      id: 'street-festival',
      label: 'Festival Street Team',
      description: 'Lead the festival street team with scheduled hype cycles and sponsor shout-outs.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 125,
      hoursRequired: 5,
      hoursPerDay: 1.25,
      daysRequired: 4,
      progressLabel: 'Lead the festival street team'
    })
  ]
};
