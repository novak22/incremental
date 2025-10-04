const tech = [
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
  },
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
  },
  {
    id: 'monitorHub',
    name: 'Monitor Dock',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Dock station that powers two 4K monitors with one cable and instant switching.',
    category: 'tech',
    family: 'monitor_hub',
    cost: 180,
    provides: { monitor: 2 },
    effects: { setup_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'setup' ] }
    },
    metrics: { cost: { label: '🖥️ Monitor dock setup', category: 'gear' } },
    logMessage: 'Your command center now has spare ports and screen real estate for days.',
    logType: 'upgrade'
  },
  {
    id: 'dualMonitorArray',
    name: 'Dual Monitor Array',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Mount two ultra-thin displays for editing, dashboards, and reference boards.',
    category: 'tech',
    family: 'monitor',
    cost: 240,
    requires: [ 'monitorHub' ],
    consumes: { monitor: 1 },
    effects: { quality_progress_mult: 1.2 },
    affects: {
      assets: { tags: [ 'desktop_work', 'video' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🖥️ Dual monitor expansion', category: 'gear' } },
    logMessage: 'Two displays keep editing, research, and dashboards aligned in view.',
    logType: 'upgrade'
  },
  {
    id: 'colorGradingDisplay',
    name: 'Color Grading Display',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Reference-grade display for colorists and photo editors who need true-to-life hues.',
    category: 'tech',
    family: 'monitor',
    cost: 380,
    requires: [ 'dualMonitorArray' ],
    consumes: { monitor: 1 },
    effects: { quality_progress_mult: 1.3 },
    affects: {
      assets: { tags: [ 'video', 'photo' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🖥️ Color grading display', category: 'gear' } },
    logMessage: 'Visual work pops with accurate hues and clients notice the upgrade.',
    logType: 'upgrade'
  },
  {
    id: 'scratchDriveArray',
    name: 'Scratch Drive Array',
    tag: { label: 'Gear', type: 'tech' },
    description: 'High-speed NVMe array that turns renders and transfers into blink-and-done tasks.',
    category: 'tech',
    family: 'storage',
    cost: 320,
    effects: { maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'video', 'photo', 'software' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '💾 Scratch drive array', category: 'gear' } },
    logMessage: 'Media transfers and cache renders scream thanks to your scratch array.',
    logType: 'upgrade'
  },
  {
    id: 'audioSuite',
    name: 'Audio Suite',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Treat the studio with acoustic foam, preamps, and mastering plug-ins.',
    category: 'tech',
    family: 'audio',
    cost: 420,
    effects: { quality_progress_mult: 1.4 },
    affects: {
      assets: { tags: [ 'audio', 'video' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🎙️ Audio suite upgrade', category: 'gear' } },
    logMessage: 'Voiceovers, podcasts, and narrations now sound buttery-smooth.',
    logType: 'upgrade'
  },
  {
    id: 'fiberInternet',
    name: 'Fiber Internet Plan',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Symmetrical gigabit connection with service-level guarantees for uploads.',
    category: 'tech',
    family: 'internet',
    cost: 260,
    effects: { maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'video', 'software' ] },
      hustles: { tags: [ 'live', 'software' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '🌐 Fiber internet upgrade', category: 'home' } },
    logMessage: 'Uploads and livestreams race through your new fiber connection.',
    logType: 'upgrade'
  },
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
  },
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
  },
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
  },
  {
    id: 'editorialPipeline',
    name: 'Editorial Pipeline Suite',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Stand up pro-grade editorial calendars so every blog post ships polished and on schedule.',
    category: 'tech',
    family: 'workflow',
    cost: 360,
    requires: [
      'course',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'outlineMastery' ],
        detail: 'Requires: <strong>Outline Mastery Workshop completed</strong>'
      }
    ],
    boosts: 'Stacks new blog and e-book bonuses across every publishing push',
    effects: {
      setup_time_mult: 0.88,
      payout_mult: 1.2,
      quality_progress_mult: 1.5
    },
    affects: {
      assets: { tags: [ 'writing', 'content' ] },
      hustles: { tags: [ 'writing' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    skills: [ 'writing', { id: 'promotion', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Build Editorial Suite',
    labels: {
      purchased: 'Editorial Suite Ready',
      missing: 'Requires Publishing Momentum'
    },
    metrics: {
      cost: { label: '🧠 Editorial pipeline build-out', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      }
    ],
    logMessage: 'Editorial pipeline humming! Your posts now glide from outline to publish without bottlenecks.',
    logType: 'upgrade'
  },
  {
    id: 'syndicationSuite',
    name: 'Syndication Suite',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Spin up partner feeds, guest slots, and cross-promotions to syndicate your best work everywhere.',
    category: 'tech',
    family: 'workflow',
    cost: 720,
    requires: [
      'editorialPipeline',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      { type: 'asset', id: 'ebook', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'brandVoiceLab' ],
        detail: 'Requires: <strong>Brand Voice Lab completed</strong>'
      }
    ],
    boosts: 'Energises blogs, e-books, and vlogs with syndicated promos and bigger payouts',
    effects: {
      maint_time_mult: 0.9,
      payout_mult: 1.25,
      quality_progress_mult: 1.3333333333333333
    },
    affects: {
      assets: { tags: [ 'writing', 'content', 'video' ] },
      hustles: { tags: [ 'writing', 'marketing' ] },
      actions: { types: [ 'maintenance', 'payout', 'quality' ] }
    },
    skills: [ 'audience', { id: 'promotion', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Launch Syndication Suite',
    labels: {
      purchased: 'Syndication Live',
      missing: 'Requires Cross-Media Presence'
    },
    metrics: {
      cost: { label: '🌐 Syndication suite rollout', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'brandVoiceLab',
        label: '🎙️ Brand Voice Lab progress'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'ebook',
        label: '📚 Active e-books in market'
      }
    ],
    logMessage: 'Syndication suite secured! Partner feeds now echo your stories across the web.',
    logType: 'upgrade'
  },
  {
    id: 'immersiveStoryWorlds',
    name: 'Immersive Story Worlds',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Blend blogs, books, and vlogs into one living universe with AR teasers and fan quests.',
    category: 'tech',
    family: 'workflow',
    cost: 1080,
    requires: [
      'syndicationSuite',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      { type: 'asset', id: 'ebook', active: true, count: 1 },
      { type: 'asset', id: 'vlog', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'outlineMastery', 'brandVoiceLab' ],
        detail: 'Requires: <strong>Outline Mastery & Brand Voice Lab completed</strong>'
      }
    ],
    boosts: 'Adds premium payouts and faster progress for every creative asset',
    effects: {
      payout_mult: 1.12,
      setup_time_mult: 0.85,
      quality_progress_mult: 2
    },
    affects: {
      assets: { tags: [ 'writing', 'video', 'photo' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    skills: [ 'visual', { id: 'writing', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Launch Story Worlds',
    labels: {
      purchased: 'Story Worlds Live',
      missing: 'Requires Immersive Audience'
    },
    metrics: {
      cost: { label: '🌌 Story world immersion build', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'ebook',
        label: '📚 Active e-books in market'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'vlog',
        label: '🎬 Active vlogs broadcasting'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'brandVoiceLab',
        label: '🎙️ Brand Voice Lab progress'
      }
    ],
    logMessage: 'Immersive story worlds unlocked! Fans now explore your universe across every channel.',
    logType: 'upgrade'
  },
  {
    id: 'course',
    name: 'Automation Course',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Unlocks smarter blogging tools, boosting blog income by +50%.',
    category: 'tech',
    family: 'workflow',
    cost: 260,
    requires: [
      {
        type: 'asset',
        id: 'blog',
        active: true,
        count: 1,
        detail: 'Requires: <strong>At least one active blog</strong>'
      }
    ],
    effects: { payout_mult: 1.5, quality_progress_mult: 2 },
    affects: {
      assets: { ids: [ 'blog' ] },
      actions: { types: [ 'payout', 'quality' ] }
    },
    skills: [ 'software' ],
    actionClassName: 'secondary',
    actionLabel: 'Study Up',
    labels: { purchased: 'Automation Ready', missing: 'Requires Active Blog' },
    metrics: {
      cost: { label: '📚 Automation course tuition', category: 'upgrade' }
    },
    logMessage: 'Automation course complete! Your blog network now earns +50% more each day.',
    logType: 'upgrade'
  }
];

export default tech;
