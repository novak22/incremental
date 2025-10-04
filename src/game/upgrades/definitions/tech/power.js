const power = [
  {
    id: 'backupPowerArray',
    name: 'Backup Power Array',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Battery backups and surge protection that keep the studio live during outages.',
    category: 'tech',
    family: 'power_backup',
    cost: 260,
    effects: { maint_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'desktop_work', 'video' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '🔋 Backup power install', category: 'home' } },
    logMessage: 'Even surprise outages can’t derail your releases anymore.',
    logType: 'upgrade'
  }
];

export default power;
