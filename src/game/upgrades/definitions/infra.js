const infra = [
  {
    id: 'assistant',
    name: 'Hire Virtual Assistant',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Scale your admin squad. Each hire adds hours at a lean $8/hr upkeep.',
    category: 'infra',
    family: 'automation',
    defaultState: { count: 0 },
    repeatable: true,
    actionClassName: 'secondary',
    blockedMessage: 'You need more funds or a free slot before hiring another assistant.'
  },
  {
    id: 'serverRack',
    name: 'Server Rack - Starter',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Spin up a reliable rack with monitoring so prototypes stay online.',
    category: 'infra',
    family: 'cloud_compute',
    cost: 650,
    unlocks: 'Stable environments for advanced products',
    effects: { setup_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'software', 'tech' ] },
      hustles: { tags: [ 'software', 'automation' ] },
      actions: { types: [ 'setup' ] }
    },
    skills: [ 'infrastructure' ],
    actionClassName: 'secondary',
    actionLabel: 'Install Rack',
    labels: { purchased: 'Rack Online' },
    metrics: {
      cost: {
        label: '🗄️ Starter server rack install',
        category: 'infrastructure'
      }
    },
    logMessage: 'Server rack assembled! Your advanced projects now have a home base.',
    logType: 'upgrade'
  },
  {
    id: 'fulfillmentAutomation',
    name: 'Fulfillment Automation Suite',
    tag: { label: 'Commerce', type: 'boost' },
    description: 'Tie together your winning storefronts with automated pick, pack, and ship magic.',
    category: 'infra',
    family: 'automation',
    cost: 780,
    requires: [
      { type: 'asset', id: 'dropshipping', count: 2, active: true },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'ecomPlaybook' ],
        detail: 'Requires: <strong>Complete the E-Commerce Playbook</strong>'
      }
    ],
    boosts: 'Dropshipping payouts + faster research/listing/ads progress',
    effects: { payout_mult: 1.25, quality_progress_mult: 2 },
    affects: {
      assets: { ids: [ 'dropshipping' ] },
      actions: { types: [ 'payout', 'quality' ] }
    },
    skills: [ 'commerce', { id: 'research', weight: 0.6 } ],
    actionClassName: 'secondary',
    actionLabel: 'Automate Fulfillment',
    labels: { purchased: 'Automation Active' },
    metrics: {
      cost: {
        label: '📦 Fulfillment automation rollout',
        category: 'upgrade'
      }
    },
    logMessage: 'Robotic pickers, synced CRMs, and instant fulfillment dashboards now power your shops.',
    logType: 'upgrade'
  },
  {
    id: 'serverCluster',
    name: 'Cloud Cluster',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Deploy auto-scaling containers and CI pipelines so your SaaS survives launch day.',
    category: 'infra',
    family: 'cloud_compute',
    cost: 1150,
    requires: [ 'serverRack' ],
    unlocks: 'SaaS deployments',
    effects: { payout_mult: 1.2, quality_progress_mult: 1.5 },
    affects: {
      assets: { ids: [ 'saas' ] },
      actions: { types: [ 'payout', 'quality' ] }
    },
    skills: [ 'infrastructure' ],
    actionClassName: 'secondary',
    actionLabel: 'Deploy Cluster',
    labels: { purchased: 'Cluster Ready', missing: 'Requires Rack' },
    metrics: {
      cost: {
        label: '☁️ Cloud cluster deployment',
        category: 'infrastructure'
      }
    },
    logMessage: 'Cloud cluster humming! SaaS deploy pipelines now run without midnight fire drills.',
    logType: 'upgrade'
  },
  {
    id: 'globalSupplyMesh',
    name: 'Global Supply Mesh',
    tag: { label: 'Commerce', type: 'boost' },
    description: 'Forge data-sharing deals with worldwide 3PL partners so inventory never sleeps.',
    category: 'infra',
    family: 'automation',
    cost: 1150,
    requires: [
      'fulfillmentAutomation',
      { type: 'asset', id: 'dropshipping', count: 3, active: true },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'photoLibrary' ],
        detail: 'Requires: <strong>Complete the Photo Catalog Curation course</strong>'
      }
    ],
    boosts: 'Dropshipping payouts surge & marketing tests finish faster',
    effects: {
      payout_mult: 1.3,
      quality_progress_mult: 1.5,
      setup_time_mult: 0.92
    },
    affects: {
      assets: { ids: [ 'dropshipping' ] },
      hustles: { tags: [ 'commerce', 'ecommerce' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    skills: [ 'commerce', { id: 'promotion', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Link Global Partners',
    labels: {
      purchased: 'Mesh Live',
      missing: 'Requires Automation & Active Shops'
    },
    metrics: {
      cost: {
        label: '🌍 Global supply mesh integration',
        category: 'upgrade'
      }
    },
    logMessage: 'You inked worldwide fulfillment agreements. Inventory syncs in real-time across every region.',
    logType: 'upgrade'
  },
  {
    id: 'serverEdge',
    name: 'Edge Delivery Network',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Distribute workloads across edge nodes for instant response times and uptime bragging rights.',
    category: 'infra',
    family: 'edge_network',
    cost: 1450,
    requires: [ 'serverCluster' ],
    boosts: 'SaaS payouts + stability progress surges',
    effects: {
      payout_mult: 1.35,
      quality_progress_mult: 2,
      maint_time_mult: 0.85
    },
    affects: {
      assets: { ids: [ 'saas' ] },
      actions: { types: [ 'payout', 'quality', 'maintenance' ] }
    },
    details: [
      '⚙️ SaaS feature, stability, and marketing pushes count double progress once edge nodes hum.',
      '📈 Subscriptions pay roughly +35% more each day with the global edge footprint.'
    ],
    skills: [ 'infrastructure' ],
    actionClassName: 'secondary',
    actionLabel: 'Activate Edge Network',
    labels: { purchased: 'Edge Live', missing: 'Requires Cluster' },
    metrics: {
      cost: { label: '🌐 Edge delivery rollout', category: 'infrastructure' }
    },
    logMessage: 'Edge network activated! Your SaaS now feels instant from any continent.',
    logType: 'upgrade'
  },
  {
    id: 'whiteLabelAlliance',
    name: 'White-Label Alliance',
    tag: { label: 'Commerce', type: 'boost' },
    description: 'Partner with boutique studios to bundle your galleries with each storefront launch.',
    category: 'infra',
    family: 'commerce_network',
    cost: 1500,
    requires: [
      'globalSupplyMesh',
      { type: 'asset', id: 'dropshipping', count: 4, active: true },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'ecomPlaybook', 'photoLibrary' ],
        detail: 'Requires: <strong>Complete both E-Commerce Playbook and Photo Catalog Curation</strong>'
      }
    ],
    boosts: 'Dropshipping & stock photo income climb together with faster ad promos',
    effects: { payout_mult: 1.35, quality_progress_mult: 1.3333333333333333 },
    affects: {
      assets: { ids: [ 'dropshipping', 'stockPhotos' ] },
      hustles: { tags: [ 'commerce', 'photo' ] },
      actions: { types: [ 'payout', 'quality' ] }
    },
    skills: [ 'commerce', { id: 'visual', weight: 0.4 } ],
    actionClassName: 'secondary',
    actionLabel: 'Sign Alliance Charter',
    labels: {
      purchased: 'Alliance Forged',
      missing: 'Requires Global Mesh & Active Shops'
    },
    metrics: {
      cost: { label: '🤝 White-label alliance charter', category: 'upgrade' }
    },
    logMessage: 'Creative partners now preload your galleries into every new storefront bundle. Co-branded kits fly off the shelves.',
    logType: 'upgrade'
  }
];

export default infra;
