import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const ebookConfig = assetConfigs.ebook; // Spec: docs/normalized_economy.json → assets.ebook
const ebookSetup = ebookConfig.setup; // Spec: docs/normalized_economy.json → assets.ebook.schedule
const ebookMaintenance = ebookConfig.maintenance; // Spec: docs/normalized_economy.json → assets.ebook.maintenance_time
const ebookIncome = ebookConfig.income; // Spec: docs/normalized_economy.json → assets.ebook.base_income
const [
  ebookQualityLevel0,
  ebookQualityLevel1,
  ebookQualityLevel2,
  ebookQualityLevel3,
  ebookQualityLevel4,
  ebookQualityLevel5
] = ebookConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.ebook.quality_curve

const ebookDefinition = createAssetDefinition({
  id: 'ebook',
  name: 'Digital E-Book Series',
  singular: 'E-Book',
  tag: { label: 'Creative', type: 'passive' },
  tags: ['writing', 'product', 'digital'],
  description: 'Package your expertise into downloadable page-turners that sell while you snooze.',
  setup: { ...ebookSetup },
  maintenance: { ...ebookMaintenance },
  skills: {
    setup: [
      'writing',
      { id: 'editing', weight: 0.75 }
    ]
  },
  income: { ...ebookIncome, logType: 'passive' },
  requirements: {
    knowledge: ['outlineMastery']
  },
  quality: {
    summary: 'Draft chapters, commission covers, and gather reviews so royalties snowball as quality climbs.',
    tracks: {
      chapters: { label: 'Chapters drafted', shortLabel: 'chapters' },
      cover: { label: 'Cover upgrades', shortLabel: 'cover art' },
      reviews: { label: 'Reader reviews', shortLabel: 'reviews' }
    },
    levels: [
      {
        level: ebookQualityLevel0.level,
        name: 'Rough Manuscript',
        description: 'A handful of notes generate only trickle royalties.',
        income: { ...ebookQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[0]
        requirements: { ...ebookQualityLevel0.requirements }
      },
      {
        level: ebookQualityLevel1.level,
        name: 'Polished Draft',
        description: 'Six chapters stitched into a bingeable volume.',
        income: { ...ebookQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[1]
        requirements: { ...ebookQualityLevel1.requirements }
      },
      {
        level: ebookQualityLevel2.level,
        name: 'Collector Edition',
        description: 'A premium cover and full season keep fans engaged.',
        income: { ...ebookQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[2]
        requirements: { ...ebookQualityLevel2.requirements }
      },
      {
        level: ebookQualityLevel3.level,
        name: 'Fandom Favorite',
        description: 'Glowing reviews lock in bestseller status.',
        income: { ...ebookQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[3]
        requirements: { ...ebookQualityLevel3.requirements }
      },
      {
        level: ebookQualityLevel4.level,
        name: 'Box Set Sensation',
        description: 'Expanded universes and deluxe art bundles keep royalties rolling.',
        income: { ...ebookQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[4]
        requirements: { ...ebookQualityLevel4.requirements }
      },
      {
        level: ebookQualityLevel5.level,
        name: 'Fandom Universe',
        description: 'Merch tie-ins and superfans push the series into evergreen bestseller lists.',
        income: { ...ebookQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.ebook.quality_curve[5]
        requirements: { ...ebookQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'writeChapter',
        label: 'Write Chapter',
        time: 2.5,
        dailyLimit: 1,
        progressKey: 'chapters',
        progressAmount: () => 1,
        skills: ['writing'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} gained another gripping chapter. Cliffhangers everywhere!`
      },
      {
        id: 'designCover',
        label: 'Commission Cover',
        time: 1.5,
        cost: 60,
        dailyLimit: 1,
        progressKey: 'cover',
        progressAmount: () => 1,
        skills: ['visual', { id: 'editing', weight: 0.6 }],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} unveiled a shiny cover mockup. Bookstores swoon.`
      },
      {
        id: 'rallyReviews',
        label: 'Rally Reviews',
        time: 1.25,
        cost: 10,
        dailyLimit: 1,
        progressKey: 'reviews',
        progressAmount: () => 1,
        skills: ['audience'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} nudged superfans for reviews. Star ratings climb skyward!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} celebrated Quality ${level}! ${levelDef?.name || 'New milestone'} unlocks tastier royalties.`
    }
  },
  messages: {
    setupStarted: label => `${label} outline is locked! Next up: polishing chapters and cover art.`,
    setupProgress: (label, completed, total) => `${label} drafting sprint is ${completed}/${total} days complete.`,
    setupComplete: label => `${label} launched! Readers are devouring chapters on every device.`,
    setupMissed: label => `${label} missed its writing block today, so progress stayed flat.`,
    income: (amount, label) => `${label} sold bundles worth $${formatMoney(amount)} today.`,
    maintenanceSkipped: label => `${label} skipped promo pushes, so the sales funnel dried up.`
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
    first: 'Author First E-Book',
    repeat: 'Write Another Volume'
  }
});

export default ebookDefinition;
