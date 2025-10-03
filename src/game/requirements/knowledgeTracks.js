export const KNOWLEDGE_TRACKS = {
  storycraftJumpstart: {
    id: 'storycraftJumpstart',
    name: 'Storycraft Jumpstart',
    description: 'Outline pillar posts for 3 days (4h/day) and polish headlines without paying tuition.',
    hoursPerDay: 4,
    days: 3,
    tuition: 0,
    instantBoosts: [
      {
        assetId: 'blog',
        assetName: 'Personal Blog Network',
        type: 'multiplier',
        amount: 0.05
      }
    ]
  },
  vlogStudioJumpstart: {
    id: 'vlogStudioJumpstart',
    name: 'Creator Studio Jumpstart',
    description: 'Shadow a creator coach for 3 days (4h/day) to frame shots, light sets, and warm up edits. Tuition free.',
    hoursPerDay: 4,
    days: 3,
    tuition: 0,
    instantBoosts: [
      {
        assetId: 'vlog',
        assetName: 'Weekly Vlog Channel',
        type: 'multiplier',
        amount: 0.05
      }
    ]
  },
  digitalShelfPrimer: {
    id: 'digitalShelfPrimer',
    name: 'Digital Shelf Primer',
    description: 'Curate e-books and galleries for 3 days (4h/day) to master metadata, covers, and storefront polish — no tuition required.',
    hoursPerDay: 4,
    days: 3,
    tuition: 0,
    instantBoosts: [
      {
        assetId: 'ebook',
        assetName: 'Digital E-Book Series',
        type: 'multiplier',
        amount: 0.05
      },
      {
        assetId: 'stockPhotos',
        assetName: 'Stock Photo Gallery',
        type: 'multiplier',
        amount: 0.05
      }
    ]
  },
  commerceLaunchPrimer: {
    id: 'commerceLaunchPrimer',
    name: 'Commerce Launch Primer',
    description: 'Shadow a fulfillment lead for 3 days (4h/day) to set up shipping flows and customer support scripts for free.',
    hoursPerDay: 4,
    days: 3,
    tuition: 0,
    instantBoosts: [
      {
        assetId: 'dropshipping',
        assetName: 'Dropshipping Product Lab',
        type: 'multiplier',
        amount: 0.05
      }
    ]
  },
  microSaasJumpstart: {
    id: 'microSaasJumpstart',
    name: 'Micro SaaS Jumpstart',
    description: 'Pair with senior engineers for 3 days (4h/day) to ship deploy scripts and uptime monitors with zero tuition.',
    hoursPerDay: 4,
    days: 3,
    tuition: 0,
    instantBoosts: [
      {
        assetId: 'saas',
        assetName: 'SaaS Micro-App',
        type: 'multiplier',
        amount: 0.05
      }
    ]
  },
  outlineMastery: {
    id: 'outlineMastery',
    name: 'Outline Mastery Workshop',
    description: 'Deep-dive into narrative scaffolding for 5 days (2h/day). Tuition due upfront.',
    hoursPerDay: 2,
    days: 5,
    tuition: 140,
    instantBoosts: [
      {
        hustleId: 'freelance',
        hustleName: 'Freelance Writing',
        type: 'multiplier',
        amount: 0.25
      },
      {
        hustleId: 'audiobookNarration',
        hustleName: 'Audiobook Narration Gig',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  photoLibrary: {
    id: 'photoLibrary',
    name: 'Photo Catalog Curation',
    description: 'Archive, tag, and light-edit your best work for 4 days (1.5h/day). Tuition due upfront.',
    hoursPerDay: 1.5,
    days: 4,
    tuition: 95,
    instantBoosts: [
      {
        hustleId: 'eventPhotoGig',
        hustleName: 'Event Photo Gig',
        type: 'multiplier',
        amount: 0.2
      }
    ]
  },
  ecomPlaybook: {
    id: 'ecomPlaybook',
    name: 'E-Commerce Playbook',
    description: 'Bundle Promo Push yields +5; dropshipping profits +15%.',
    hoursPerDay: 3,
    days: 9,
    tuition: 900,
    instantBoosts: [
      {
        hustleId: 'bundlePush',
        hustleName: 'Bundle Promo Push',
        type: 'flat',
        amount: 5
      },
      {
        assetId: 'dropshipping',
        assetName: 'Dropshipping Product Lab',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  automationCourse: {
    id: 'automationCourse',
    name: 'Automation Architecture Course',
    description: 'SaaS Bug Squash retainers +6; SaaS Micro-App subscriptions +15%.',
    hoursPerDay: 6,
    days: 15,
    tuition: 3000,
    instantBoosts: [
      {
        hustleId: 'saasBugSquash',
        hustleName: 'SaaS Bug Squash',
        type: 'flat',
        amount: 6
      },
      {
        assetId: 'saas',
        assetName: 'SaaS Micro-App',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  brandVoiceLab: {
    id: 'brandVoiceLab',
    name: 'Brand Voice Lab',
    description: 'Work with pitch coaches for 4 days (1h/day) to sharpen live Q&A charisma.',
    hoursPerDay: 1,
    days: 4,
    tuition: 120,
    instantBoosts: [
      {
        hustleId: 'audienceCall',
        hustleName: 'Audience Q&A Blast',
        type: 'flat',
        amount: 4
      }
    ]
  },
  guerillaBuzzWorkshop: {
    id: 'guerillaBuzzWorkshop',
    name: 'Guerrilla Buzz Workshop',
    description: 'Field-test hype hooks for 6 days (1.5h/day) with a crew of street marketers.',
    hoursPerDay: 1.5,
    days: 6,
    tuition: 180,
    instantBoosts: [
      {
        hustleId: 'streetPromoSprint',
        hustleName: 'Street Promo Sprint',
        type: 'multiplier',
        amount: 0.25
      },
      {
        hustleId: 'surveySprint',
        hustleName: 'Micro Survey Dash',
        type: 'flat',
        amount: 1.5
      }
    ]
  },
  curriculumDesignStudio: {
    id: 'curriculumDesignStudio',
    name: 'Curriculum Design Studio',
    description: 'Prototype interactive lesson plans for 6 days (2.5h/day) with veteran educators.',
    hoursPerDay: 2.5,
    days: 6,
    tuition: 280,
    instantBoosts: [
      {
        hustleId: 'popUpWorkshop',
        hustleName: 'Pop-Up Workshop',
        type: 'multiplier',
        amount: 0.3
      },
      {
        hustleId: 'bundlePush',
        hustleName: 'Bundle Promo Push',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  postProductionPipelineLab: {
    id: 'postProductionPipelineLab',
    name: 'Post-Production Pipeline Lab',
    description: 'Vlog Edit Rush payouts +25%; Weekly Vlog Channel income +15%.',
    hoursPerDay: 4,
    days: 10,
    tuition: 900,
    instantBoosts: [
      {
        hustleId: 'vlogEditRush',
        hustleName: 'Vlog Edit Rush',
        type: 'multiplier',
        amount: 0.25
      },
      {
        assetId: 'vlog',
        assetName: 'Weekly Vlog Channel',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  fulfillmentOpsMasterclass: {
    id: 'fulfillmentOpsMasterclass',
    name: 'Fulfillment Ops Masterclass',
    description: 'Dropship Pack Party earnings +20%; dropshipping revenue +25%.',
    hoursPerDay: 4,
    days: 10,
    tuition: 1200,
    instantBoosts: [
      {
        hustleId: 'dropshipPackParty',
        hustleName: 'Dropship Pack Party',
        type: 'multiplier',
        amount: 0.2
      },
      {
        assetId: 'dropshipping',
        assetName: 'Dropshipping Product Lab',
        type: 'multiplier',
        amount: 0.25
      }
    ]
  },
  customerRetentionClinic: {
    id: 'customerRetentionClinic',
    name: 'Customer Retention Clinic',
    description: 'SaaS Bug Squash retainers +$5; SaaS Micro-App subscriptions +20%.',
    hoursPerDay: 3,
    days: 7,
    tuition: 1000,
    instantBoosts: [
      {
        hustleId: 'saasBugSquash',
        hustleName: 'SaaS Bug Squash',
        type: 'flat',
        amount: 5
      },
      {
        assetId: 'saas',
        assetName: 'SaaS Micro-App',
        type: 'multiplier',
        amount: 0.2
      }
    ]
  },
  narrationPerformanceWorkshop: {
    id: 'narrationPerformanceWorkshop',
    name: 'Narration Performance Workshop',
    description: 'Audiobook Narration payouts +25%; e-book royalties +10%.',
    hoursPerDay: 3,
    days: 7,
    tuition: 900,
    instantBoosts: [
      {
        hustleId: 'audiobookNarration',
        hustleName: 'Audiobook Narration',
        type: 'multiplier',
        amount: 0.25
      },
      {
        assetId: 'ebook',
        assetName: 'Digital E-Book Series',
        type: 'multiplier',
        amount: 0.1
      }
    ]
  },
  galleryLicensingSummit: {
    id: 'galleryLicensingSummit',
    name: 'Gallery Licensing Summit',
    description: 'Event Photo Gig bookings +20%; Stock Photo Gallery income +15%.',
    hoursPerDay: 4,
    days: 8,
    tuition: 1100,
    instantBoosts: [
      {
        hustleId: 'eventPhotoGig',
        hustleName: 'Event Photo Gig',
        type: 'multiplier',
        amount: 0.2
      },
      {
        assetId: 'stockPhotos',
        assetName: 'Stock Photo Gallery',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  syndicationResidency: {
    id: 'syndicationResidency',
    name: 'Syndication Residency',
    description: 'Freelance Writing payouts +15%; Street Promo Sprint tips +$2; Blog Network income +12%.',
    hoursPerDay: 4,
    days: 9,
    tuition: 1000,
    instantBoosts: [
      {
        hustleId: 'freelance',
        hustleName: 'Freelance Writing',
        type: 'multiplier',
        amount: 0.15
      },
      {
        hustleId: 'streetPromoSprint',
        hustleName: 'Street Promo Sprint',
        type: 'flat',
        amount: 2
      },
      {
        assetId: 'blog',
        assetName: 'Personal Blog Network',
        type: 'multiplier',
        amount: 0.12
      }
    ]
  }
};

export const KNOWLEDGE_REWARDS = {
  storycraftJumpstart: { baseXp: 120, skills: ['writing'] },
  vlogStudioJumpstart: { baseXp: 120, skills: ['visual'] },
  digitalShelfPrimer: { baseXp: 120, skills: ['editing'] },
  commerceLaunchPrimer: { baseXp: 120, skills: ['commerce'] },
  microSaasJumpstart: { baseXp: 120, skills: ['software'] },
  outlineMastery: { baseXp: 120, skills: ['writing'] },
  photoLibrary: {
    baseXp: 120,
    skills: [
      { id: 'visual', weight: 0.5 },
      { id: 'editing', weight: 0.5 }
    ]
  },
  ecomPlaybook: {
    baseXp: 120,
    skills: [
      { id: 'research', weight: 0.5 },
      { id: 'commerce', weight: 0.5 }
    ]
  },
  automationCourse: {
    baseXp: 120,
    skills: [
      { id: 'software', weight: 0.6 },
      { id: 'infrastructure', weight: 0.4 }
    ]
  },
  brandVoiceLab: {
    baseXp: 100,
    skills: [
      { id: 'audience', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  guerillaBuzzWorkshop: {
    baseXp: 110,
    skills: [
      { id: 'promotion', weight: 0.6 },
      { id: 'audience', weight: 0.4 }
    ]
  },
  curriculumDesignStudio: {
    baseXp: 150,
    skills: [
      { id: 'audience', weight: 0.6 },
      { id: 'writing', weight: 0.4 }
    ]
  },
  postProductionPipelineLab: {
    baseXp: 150,
    skills: [
      { id: 'editing', weight: 0.7 },
      { id: 'visual', weight: 0.3 }
    ]
  },
  fulfillmentOpsMasterclass: {
    baseXp: 140,
    skills: [
      { id: 'commerce', weight: 0.7 },
      { id: 'promotion', weight: 0.3 }
    ]
  },
  customerRetentionClinic: {
    baseXp: 140,
    skills: [
      { id: 'audience', weight: 0.4 },
      { id: 'promotion', weight: 0.3 },
      { id: 'software', weight: 0.3 }
    ]
  },
  narrationPerformanceWorkshop: {
    baseXp: 130,
    skills: [
      { id: 'audio', weight: 0.6 },
      { id: 'writing', weight: 0.4 }
    ]
  },
  galleryLicensingSummit: {
    baseXp: 140,
    skills: [
      { id: 'visual', weight: 0.6 },
      { id: 'commerce', weight: 0.4 }
    ]
  },
  syndicationResidency: {
    baseXp: 150,
    skills: [
      { id: 'promotion', weight: 0.5 },
      { id: 'audience', weight: 0.3 },
      { id: 'writing', weight: 0.2 }
    ]
  }
};

export default KNOWLEDGE_TRACKS;
