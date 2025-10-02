export const KNOWLEDGE_TRACKS = {
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
    description: 'Shadow a pro operator for 7 days (2h/day) to master funnels and fulfillment math.',
    hoursPerDay: 2,
    days: 7,
    tuition: 260,
    instantBoosts: [
      {
        hustleId: 'bundlePush',
        hustleName: 'Bundle Promo Push',
        type: 'flat',
        amount: 6
      },
      {
        hustleId: 'dropshipPackParty',
        hustleName: 'Dropship Pack Party',
        type: 'multiplier',
        amount: 0.2
      }
    ]
  },
  automationCourse: {
    id: 'automationCourse',
    name: 'Automation Architecture Course',
    description: 'Pair-program with mentors for 10 days (~2¼h/day) to architect a reliable micro-app.',
    hoursPerDay: 2.25,
    days: 10,
    tuition: 540,
    instantBoosts: [
      {
        hustleId: 'saasBugSquash',
        hustleName: 'SaaS Bug Squash',
        type: 'flat',
        amount: 12
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
    description: 'Run edit bays for 8 days (3h/day) to master color, captions, and delivery workflows.',
    hoursPerDay: 3,
    days: 8,
    tuition: 360,
    instantBoosts: [
      {
        hustleId: 'vlogEditRush',
        hustleName: 'Vlog Edit Rush',
        type: 'multiplier',
        amount: 0.35
      },
      {
        assetId: 'vlog',
        assetName: 'Weekly Vlog Channel',
        type: 'multiplier',
        amount: 0.18
      }
    ]
  },
  fulfillmentOpsMasterclass: {
    id: 'fulfillmentOpsMasterclass',
    name: 'Fulfillment Ops Masterclass',
    description: 'Shadow a 7-day (2h/day) logistics crew to automate pick, pack, and ship perfection.',
    hoursPerDay: 2,
    days: 7,
    tuition: 320,
    instantBoosts: [
      {
        hustleId: 'dropshipPackParty',
        hustleName: 'Dropship Pack Party',
        type: 'multiplier',
        amount: 0.25
      },
      {
        assetId: 'dropshipping',
        assetName: 'Dropshipping Product Lab',
        type: 'multiplier',
        amount: 0.35
      }
    ]
  },
  customerRetentionClinic: {
    id: 'customerRetentionClinic',
    name: 'Customer Retention Clinic',
    description: 'Coach subscription success teams for 5 days (2h/day) to keep churn near zero.',
    hoursPerDay: 2,
    days: 5,
    tuition: 210,
    instantBoosts: [
      {
        hustleId: 'saasBugSquash',
        hustleName: 'SaaS Bug Squash',
        type: 'flat',
        amount: 8
      },
      {
        assetId: 'saas',
        assetName: 'SaaS Micro-App',
        type: 'multiplier',
        amount: 0.25
      }
    ]
  },
  narrationPerformanceWorkshop: {
    id: 'narrationPerformanceWorkshop',
    name: 'Narration Performance Workshop',
    description: 'Spend 4 days (1.75h/day) with vocal coaches to perfect audiobook cadence.',
    hoursPerDay: 1.75,
    days: 4,
    tuition: 190,
    instantBoosts: [
      {
        hustleId: 'audiobookNarration',
        hustleName: 'Audiobook Narration',
        type: 'multiplier',
        amount: 0.3
      },
      {
        assetId: 'ebook',
        assetName: 'Digital E-Book Series',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  galleryLicensingSummit: {
    id: 'galleryLicensingSummit',
    name: 'Gallery Licensing Summit',
    description: 'Pitch curators for 5 days (2.25h/day) to secure premium gallery licensing deals.',
    hoursPerDay: 2.25,
    days: 5,
    tuition: 240,
    instantBoosts: [
      {
        hustleId: 'eventPhotoGig',
        hustleName: 'Event Photo Gig',
        type: 'multiplier',
        amount: 0.3
      },
      {
        assetId: 'stockPhotos',
        assetName: 'Stock Photo Gallery',
        type: 'multiplier',
        amount: 0.22
      }
    ]
  },
  syndicationResidency: {
    id: 'syndicationResidency',
    name: 'Syndication Residency',
    description: 'Curate partnerships for 6 days (2h/day) to syndicate your flagship content network.',
    hoursPerDay: 2,
    days: 6,
    tuition: 300,
    instantBoosts: [
      {
        hustleId: 'freelance',
        hustleName: 'Freelance Writing',
        type: 'multiplier',
        amount: 0.2
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
        amount: 0.18
      }
    ]
  }
};

export const KNOWLEDGE_REWARDS = {
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
