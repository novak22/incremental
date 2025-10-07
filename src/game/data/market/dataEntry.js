import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'ops',
  seats: 1,
  slotsPerRoll: 6,
  maxActive: 6,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Clear the queued spreadsheets',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'data-entry-ledger',
      label: 'Ledger Cleanup Sprint',
      description: 'Audit invoices and reconcile transaction logs before monthly reporting.',
      copies: 4,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Reconcile the ledger backlog'
    }),
    ({ hours }) => buildVariant({
      id: 'data-entry-catalog',
      label: 'Catalog Migration',
      description: 'Normalize SKUs and migrate listings into a new storefront database over two days.',
      durationDays: 1,
      payoutAmount: 45,
      hoursRequired: hours * 2,
      hoursPerDay: hours,
      daysRequired: 2,
      progressLabel: 'Migrate the catalog inventory'
    })
  ]
};
