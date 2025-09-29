import { formatMoney } from '../../../core/helpers.js';
import { getUpgradeState } from '../../../core/state.js';
import { createAssetDefinition } from '../../content/schema.js';

const stockPhotosDefinition = createAssetDefinition({
  id: 'stockPhotos',
  name: 'Stock Photo Galleries',
  singular: 'Gallery',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Stage props, shoot themed collections, and list them across marketplaces.',
  setup: { days: 5, hoursPerDay: 4, cost: 560 },
  maintenance: { hours: 1.2, cost: 10 },
  skills: {
    setup: [
      'visual',
      { id: 'editing', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  income: {
    base: 58,
    variance: 0.35,
    logType: 'passive',
    modifier: amount => {
      const expansion = getUpgradeState('studioExpansion').purchased ? 1.2 : 1;
      return Math.round(amount * expansion);
    }
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
        income: { min: 4, max: 9 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Curated Collections',
        description: 'Four themed shoots unlock daily bundles.',
        income: { min: 18, max: 30 },
        requirements: { shoots: 4 }
      },
      {
        level: 2,
        name: 'Marketplace Darling',
        description: 'Batch edits make downloads soar.',
        income: { min: 34, max: 52 },
        requirements: { shoots: 10, editing: 4 }
      },
      {
        level: 3,
        name: 'Brand Staple',
        description: 'Marketing funnels keep cash flowing.',
        income: { min: 54, max: 78 },
        requirements: { shoots: 16, editing: 7, marketing: 5 }
      },
      {
        level: 4,
        name: 'Agency Mainstay',
        description: 'Every campaign brief leans on your polished libraries.',
        income: { min: 80, max: 108 },
        requirements: { shoots: 24, editing: 11, marketing: 9 }
      },
      {
        level: 5,
        name: 'Global Brand Kit',
        description: 'Exclusive partnerships and licensing deals rain down premium royalties.',
        income: { min: 112, max: 150 },
        requirements: { shoots: 36, editing: 16, marketing: 14 }
      }
    ],
    actions: [
      {
        id: 'planShoot',
        label: 'Plan Shoot',
        time: 3.5,
        cost: 22,
        progressKey: 'shoots',
        progressAmount: context => (context.upgrade('studioExpansion')?.purchased ? 2 : 1),
        skills: ['visual'],
        log: ({ label }) => `${label} staged a dazzling shoot. Props now live rent-free in your studio.`
      },
      {
        id: 'batchEdit',
        label: 'Batch Edit',
        time: 2,
        cost: 14,
        progressKey: 'editing',
        progressAmount: context => (context.upgrade('studioExpansion')?.purchased ? 2 : 1),
        skills: ['editing'],
        log: ({ label }) => `${label} batch-edited a gallery. Clients cheer at the crisp exports!`
      },
      {
        id: 'runPromo',
        label: 'Run Promo',
        time: 2,
        cost: 16,
        progressKey: 'marketing',
        progressAmount: context => (context.upgrade('studioExpansion')?.purchased ? 2 : 1),
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
