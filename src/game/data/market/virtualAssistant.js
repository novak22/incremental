import { buildBaseMetadata, buildVariant } from '../../hustles/configBuilders.js';

export default {
  category: 'ops',
  seats: 1,
  slotsPerRoll: 3,
  maxActive: 6,
  metadata: ({ hours, payout }) => buildBaseMetadata({
    hoursRequired: hours,
    payoutAmount: payout,
    progressLabel: 'Handle the virtual assistant shift',
    hoursPerDay: hours,
    daysRequired: 1
  }),
  variants: [
    ({ hours, payout }) => buildVariant({
      id: 'virtual-assistant-inbox',
      label: 'Inbox Zero Patrol',
      description: 'Sweep the shared inbox, flag hot leads, and schedule follow-ups before lunch.',
      copies: 2,
      payoutAmount: payout,
      hoursRequired: hours,
      hoursPerDay: hours,
      daysRequired: 1,
      progressLabel: 'Triage the inbox backlog'
    }),
    ({ hours, payout }) => buildVariant({
      id: 'virtual-assistant-calendar',
      label: 'Calendar Concierge',
      description: 'Coordinate interviews, juggle time zones, and prep tomorrow’s agenda.',
      durationDays: 1,
      payoutAmount: payout * 2,
      hoursRequired: hours * 2,
      hoursPerDay: hours,
      daysRequired: 2,
      progressLabel: 'Orchestrate the schedule sync'
    }),
    ({ hours, payout }) => buildVariant({
      id: 'virtual-assistant-research',
      label: 'Launch Prep Research',
      description: 'Gather vendor quotes, compile briefs, and keep stakeholders updated.',
      availableAfterDays: 1,
      durationDays: 2,
      payoutAmount: payout * 3,
      hoursRequired: hours * 3,
      hoursPerDay: hours,
      daysRequired: 3,
      progressLabel: 'Ship the launch prep dossier'
    })
  ]
};
