import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'software',
  seats: 1,
  slotsPerRoll: 2,
  maxActive: 3,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Deploy the emergency fix',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'saas-hotfix',
      label: 'Hotfix Call',
      description: 'Trace crashes and patch the production build before support tickets pile up.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Ship the emergency hotfix'
    }),
    () => buildVariant({
      id: 'saas-hardening',
      label: 'Stability Hardening',
      description: 'Audit the service, expand tests, and close regression gaps over two days.',
      durationDays: 1,
      payoutAmount: 80,
      hoursRequired: 2.5,
      hoursPerDay: 1.25,
      daysRequired: 2,
      progressLabel: 'Harden the service for stability'
    }),
    () => buildVariant({
      id: 'saas-sprint',
      label: 'Reliability Sprint',
      description: 'Lead a week-long reliability sprint with telemetry hooks and rollout plans.',
      availableAfterDays: 1,
      durationDays: 3,
      payoutAmount: 190,
      hoursRequired: 6,
      hoursPerDay: 1.5,
      daysRequired: 4,
      progressLabel: 'Lead the reliability sprint'
    })
  ]
};
