const pcs = [
  {
    id: 'studioLaptop',
    name: 'Studio Laptop',
    tag: { label: 'Gear', type: 'tech' },
    description: 'High-refresh laptop tuned for editing, streaming, and multitasking.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    cost: 280,
    effects: { setup_time_mult: 0.92 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      hustles: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'setup' ] }
    },
    metrics: { cost: { label: '💻 Studio laptop purchase', category: 'gear' } },
    logMessage: 'Editing suites and dashboards glide on your new studio laptop.',
    logType: 'upgrade'
  },
  {
    id: 'editingWorkstation',
    name: 'Editing Workstation',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Desktop workstation with GPU acceleration and silent cooling for marathon edits.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    cost: 640,
    requires: [ 'studioLaptop' ],
    effects: { setup_time_mult: 0.85, maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'desktop_work', 'video' ] },
      actions: { types: [ 'setup', 'maintenance' ] }
    },
    metrics: {
      cost: { label: '🖥️ Editing workstation build', category: 'gear' }
    },
    logMessage: 'Your workstation devours timelines and exports while you plan the next drop.',
    logType: 'upgrade'
  },
  {
    id: 'quantumRig',
    name: 'Quantum Creator Rig',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Cutting-edge rig with neural encoders and instant renders for ambitious builds.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    cost: 1280,
    requires: [ 'editingWorkstation' ],
    effects: { payout_mult: 1.12, maint_time_mult: 0.85 },
    affects: {
      assets: { tags: [ 'desktop_work', 'software', 'video' ] },
      actions: { types: [ 'maintenance', 'payout' ] }
    },
    metrics: { cost: { label: '🧠 Quantum rig investment', category: 'gear' } },
    logMessage: 'Rendering, compiling, and editing now feel instant—your rig hums with headroom.',
    logType: 'upgrade'
  }
];

export default pcs;
