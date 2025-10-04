const phones = [
  {
    id: 'creatorPhone',
    name: 'Creator Phone - Starter',
    tag: { label: 'Gear', type: 'tech' },
    description: 'A stabilised creator phone that shoots crisp 4K clips and behind-the-scenes snaps.',
    category: 'tech',
    family: 'phone',
    exclusivityGroup: 'tech:phone',
    cost: 140,
    effects: { setup_time_mult: 0.95 },
    affects: {
      hustles: { tags: [ 'live', 'field' ] },
      assets: { tags: [ 'video' ] },
      actions: { types: [ 'setup' ] }
    },
    metrics: { cost: { label: '📱 Creator phone purchase', category: 'gear' } },
    logMessage: 'Pocket studio unlocked! IRL clips are now smoother and faster to capture.',
    logType: 'upgrade'
  },
  {
    id: 'creatorPhonePro',
    name: 'Creator Phone - Pro',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Upgraded camera array with on-device editing suites for instant field delivery.',
    category: 'tech',
    family: 'phone',
    exclusivityGroup: 'tech:phone',
    cost: 360,
    requires: [ 'creatorPhone' ],
    effects: { setup_time_mult: 0.85, payout_mult: 1.05 },
    affects: {
      hustles: { tags: [ 'live', 'field' ] },
      assets: { tags: [ 'video' ] },
      actions: { types: [ 'setup', 'payout' ] }
    },
    metrics: {
      cost: { label: '📱 Creator phone pro upgrade', category: 'gear' }
    },
    logMessage: 'Cinematic mobile shots now flow straight from pocket to platform.',
    logType: 'upgrade'
  },
  {
    id: 'creatorPhoneUltra',
    name: 'Creator Phone - Ultra',
    tag: { label: 'Gear', type: 'tech' },
    description: 'AI framing, lidar depth, and broadcast-ready uplinks for live storytelling.',
    category: 'tech',
    family: 'phone',
    exclusivityGroup: 'tech:phone',
    cost: 720,
    requires: [ 'creatorPhonePro' ],
    effects: { setup_time_mult: 0.8, payout_mult: 1.08 },
    affects: {
      hustles: { tags: [ 'live', 'field' ] },
      assets: { tags: [ 'video' ] },
      actions: { types: [ 'setup', 'payout' ] }
    },
    metrics: {
      cost: { label: '📱 Creator phone ultra upgrade', category: 'gear' }
    },
    logMessage: 'Your mobile studio now beams polished stories from anywhere in seconds.',
    logType: 'upgrade'
  }
];

export default phones;
