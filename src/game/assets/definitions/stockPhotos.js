import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const stockPhotosConfig = assetConfigs.stockPhotos; // Spec: docs/normalized_economy.json → assets.stockPhotos
const stockPhotosSetup = stockPhotosConfig.setup; // Spec: docs/normalized_economy.json → assets.stockPhotos.schedule
const stockPhotosMaintenance = stockPhotosConfig.maintenance; // Spec: docs/normalized_economy.json → assets.stockPhotos.maintenance_time
const stockPhotosIncome = stockPhotosConfig.income; // Spec: docs/normalized_economy.json → assets.stockPhotos.base_income
const [
  stockPhotosQualityLevel0,
  stockPhotosQualityLevel1,
  stockPhotosQualityLevel2,
  stockPhotosQualityLevel3,
  stockPhotosQualityLevel4,
  stockPhotosQualityLevel5
] = stockPhotosConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve

const stockPhotosDefinition = createAssetDefinition({
  id: 'stockPhotos',
  name: 'Stock Photo Galleries',
  singular: 'Gallery',
  tag: { label: 'Creative', type: 'passive' },
  tags: ['photo', 'visual', 'content'],
  description: 'Stage props, shoot themed collections, and list them across marketplaces.',
  setup: { ...stockPhotosSetup },
  maintenance: { ...stockPhotosMaintenance },
  skills: {
    setup: [
      'visual',
      { id: 'editing', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  income: { ...stockPhotosIncome, logType: 'passive' },
  requirements: {
    equipment: ['camera', 'studio'],
    knowledge: ['photoLibrary']
  },
  quality: {
    summary: 'Plan shoots, edit batches, and grow marketing funnels to transform trickle sales into daily bundles.',
    tracks: {
      shoots: { label: 'Photo shoots', shortLabel: 'shoots' },
      editing: { label: 'Batch edits', shortLabel: 'edits' },
      marketing: { label: 'Marketing pushes', shortLabel: 'marketing runs' }
    },
    levels: [
      {
        level: stockPhotosQualityLevel0.level,
        name: 'Camera Roll Chaos',
        description: 'Unsorted shoots drip pennies.',
        income: { ...stockPhotosQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[0]
        requirements: { ...stockPhotosQualityLevel0.requirements }
      },
      {
        level: stockPhotosQualityLevel1.level,
        name: 'Curated Collections',
        description: 'Four themed shoots unlock daily bundles.',
        income: { ...stockPhotosQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[1]
        requirements: { ...stockPhotosQualityLevel1.requirements }
      },
      {
        level: stockPhotosQualityLevel2.level,
        name: 'Marketplace Darling',
        description: 'Batch edits make downloads soar.',
        income: { ...stockPhotosQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[2]
        requirements: { ...stockPhotosQualityLevel2.requirements }
      },
      {
        level: stockPhotosQualityLevel3.level,
        name: 'Brand Staple',
        description: 'Marketing funnels keep cash flowing.',
        income: { ...stockPhotosQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[3]
        requirements: { ...stockPhotosQualityLevel3.requirements }
      },
      {
        level: stockPhotosQualityLevel4.level,
        name: 'Agency Mainstay',
        description: 'Every campaign brief leans on your polished libraries.',
        income: { ...stockPhotosQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[4]
        requirements: { ...stockPhotosQualityLevel4.requirements }
      },
      {
        level: stockPhotosQualityLevel5.level,
        name: 'Global Brand Kit',
        description: 'Exclusive partnerships and licensing deals rain down premium royalties.',
        income: { ...stockPhotosQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.stockPhotos.quality_curve[5]
        requirements: { ...stockPhotosQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'planShoot',
        label: 'Plan Shoot',
        time: 3.5,
        cost: 22,
        dailyLimit: 1,
        progressKey: 'shoots',
        progressAmount: () => 1,
        skills: ['visual'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} staged a dazzling shoot. Props now live rent-free in your studio.`
      },
      {
        id: 'batchEdit',
        label: 'Batch Edit',
        time: 2,
        cost: 14,
        dailyLimit: 1,
        progressKey: 'editing',
        progressAmount: () => 1,
        skills: ['editing'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} batch-edited a gallery. Clients cheer at the crisp exports!`
      },
      {
        id: 'runPromo',
        label: 'Run Promo',
        time: 2,
        cost: 16,
        dailyLimit: 1,
        progressKey: 'marketing',
        progressAmount: () => 1,
        skills: ['promotion'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} ran a marketplace feature promo. Download counters spin faster!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} climbed to Quality ${level}! ${levelDef?.name || 'New milestone'} brings steadier sales.`
    }
  },
  messages: {
    setupStarted: label => `${label} is booking talent and locations.`,
    setupProgress: (label, completed, total) => `${label} has wrapped ${completed}/${total} prep days.`,
    setupComplete: label => `${label} launched its gallery! Clients love the curated sets.`,
    setupMissed: label => `${label} skipped the shoot today, so progress paused.`,
    income: (amount, label) => `${label} sold licensing packs worth $${formatMoney(amount)}.`,
    maintenanceSkipped: label => `${label} skipped its retouch session, so agencies held back payouts.`
  },
  detailKeys: [
    'owned',
    'setup',
    'setupCost',
    'maintenance',
    'requirements',
    'qualitySummary',
    'qualityProgress',
    'income',
    'latestYield'
  ],
  actionLabels: {
    first: 'Open Gallery',
    repeat: 'Launch Another Gallery'
  }
});

export default stockPhotosDefinition;
