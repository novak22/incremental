const support = [
  {
    id: 'coffee',
    name: 'Turbo Coffee',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Instantly gain +1h of focus for today. Side effects include jittery success.',
    category: 'support',
    family: 'consumable',
    cost: 40,
    repeatable: true,
    defaultState: { usedToday: 0 },
    actionClassName: 'secondary',
    actionLabel: 'Brew Boost',
    blockedMessage: 'You hit the caffeine limit, ran out of cash, or need more hours before brewing another cup.',
    metrics: { cost: { label: '☕ Turbo coffee boost', category: 'consumable' } },
    logMessage: 'Turbo coffee acquired! You feel invincible for another hour (ish).',
    logType: 'boost'
  }
];

export default support;
