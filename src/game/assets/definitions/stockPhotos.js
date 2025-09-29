import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';

const stockPhotosDefinition = createAssetDefinition({
  id: 'stockPhotos',
  name: 'Stock Photo Galleries',
  singular: 'Gallery',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Stage props, shoot themed collections, and list them across marketplaces.',
  setup: { days: 5, hoursPerDay: 4, cost: 560 },
  maintenance: { hours: 1.5, cost: 12 },
  skills: {
    setup: [
      'visual',
      { id: 'editing', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  income: {
    base: 42,
    variance: 0.25,
    logType: 'passive'
  },
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
        level: 0,
        name: 'Camera Roll Chaos',
        description: 'Unsorted shoots drip pennies.',
        income: { min: 2, max: 5 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Curated Collections',
        description: 'Five themed shoots win daily sales.',
        income: { min: 12, max: 20 },
        requirements: { shoots: 5 }
      },
      {
        level: 2,
        name: 'Marketplace Darling',
        description: 'Batch edits make downloads soar.',
        income: { min: 22, max: 32 },
        requirements: { shoots: 12, editing: 4 }
      },
      {
        level: 3,
        name: 'Brand Staple',
        description: 'Marketing funnels keep cash flowing.',
        income: { min: 30, max: 44 },
        requirements: { shoots: 18, editing: 7, marketing: 5 }
      }
    ],
    actions: [
      {
        id: 'planShoot',
        label: 'Plan Shoot',
        time: 4,
        cost: 24,
        progressKey: 'shoots',
        skills: ['visual'],
        log: ({ label }) => `${label} staged a dazzling shoot. Props now live rent-free in your studio.`
      },
      {
        id: 'batchEdit',
        label: 'Batch Edit',
        time: 2.5,
        cost: 16,
        progressKey: 'editing',
        skills: ['editing'],
        log: ({ label }) => `${label} batch-edited a gallery. Clients cheer at the crisp exports!`
      },
      {
        id: 'runPromo',
        label: 'Run Promo',
        time: 2,
        cost: 18,
        progressKey: 'marketing',
        skills: ['promotion'],
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
