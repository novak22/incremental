const ergonomics = [
  {
    id: 'ergonomicRefit',
    name: 'Ergonomic Refit',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Sit-stand desk, supportive chair, and smart lighting for marathon editing sessions.',
    category: 'tech',
    family: 'ergonomics',
    cost: 180,
    effects: { maint_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '🪑 Ergonomic refit', category: 'home' } },
    logMessage: 'Back-saving upgrades keep your output steady without burnout.',
    logType: 'upgrade'
  }
];

export default ergonomics;
