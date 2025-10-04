const cameras = [
  {
    id: 'camera',
    name: 'Camera',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Unlocks video production gear so you can start vlogs and shoot stock photos.',
    category: 'tech',
    family: 'camera',
    exclusivityGroup: 'tech:camera',
    cost: 200,
    unlocks: 'Weekly Vlog Channel & Stock Photo Galleries',
    skills: [ 'visual' ],
    effects: { setup_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'video', 'photo' ] },
      hustles: { tags: [ 'video', 'photo' ] },
      actions: { types: [ 'setup' ] }
    },
    actionClassName: 'secondary',
    actionLabel: 'Purchase Camera',
    labels: { purchased: 'Camera Ready' },
    metrics: { cost: { label: '🎥 Camera purchase', category: 'upgrade' } },
    logMessage: 'You bought a mirrorless camera rig. Vlogs and photo galleries just unlocked!',
    logType: 'upgrade'
  },
  {
    id: 'cameraPro',
    name: 'Cinema Camera Upgrade',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Upgrade your rig with cinema glass and stabilized mounts for prestige productions.',
    category: 'tech',
    family: 'camera',
    exclusivityGroup: 'tech:camera',
    cost: 480,
    requires: [ 'camera' ],
    boosts: 'Boosts vlog payouts and doubles quality progress',
    effects: {
      setup_time_mult: 0.85,
      maint_time_mult: 0.85,
      payout_mult: 1.25,
      quality_progress_mult: 2
    },
    affects: {
      assets: { tags: [ 'video', 'photo' ] },
      actions: { types: [ 'setup', 'maintenance', 'payout', 'quality' ] }
    },
    details: [
      '🎞️ Vlog quality actions count double progress once the cinema rig is live.',
      '💰 Daily vlog income jumps by roughly +25% and viral bursts spike harder.'
    ],
    skills: [ 'visual' ],
    actionClassName: 'secondary',
    actionLabel: 'Install Cinema Gear',
    labels: { purchased: 'Cinema Ready', missing: 'Requires Camera' },
    metrics: {
      cost: { label: '🎬 Cinema camera upgrade', category: 'upgrade' }
    },
    logMessage: 'Cinema camera calibrated! Your vlogs now look blockbuster-bright.',
    logType: 'upgrade'
  }
];

export default cameras;
