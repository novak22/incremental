import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';

const ebookDefinition = createAssetDefinition({
  id: 'ebook',
  name: 'Digital E-Book Series',
  singular: 'E-Book',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Package your expertise into downloadable page-turners that sell while you snooze.',
  setup: { days: 4, hoursPerDay: 3, cost: 260 },
  maintenance: { hours: 0.75, cost: 3 },
  income: {
    base: 30,
    variance: 0.2,
    logType: 'passive'
  },
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
        level: 0,
        name: 'Rough Manuscript',
        description: 'A handful of notes generate only trickle royalties.',
        income: { min: 3, max: 6 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Polished Draft',
        description: 'Six chapters stitched into a bingeable volume.',
        income: { min: 12, max: 20 },
        requirements: { chapters: 6 }
      },
      {
        level: 2,
        name: 'Collector Edition',
        description: 'A premium cover and full season keep fans engaged.',
        income: { min: 20, max: 30 },
        requirements: { chapters: 12, cover: 1 }
      },
      {
        level: 3,
        name: 'Fandom Favorite',
        description: 'Glowing reviews lock in bestseller status.',
        income: { min: 30, max: 42 },
        requirements: { chapters: 18, cover: 2, reviews: 6 }
      }
    ],
    actions: [
      {
        id: 'writeChapter',
        label: 'Write Chapter',
        time: 2.5,
        progressKey: 'chapters',
        log: ({ label }) => `${label} gained another gripping chapter. Cliffhangers everywhere!`
      },
      {
        id: 'designCover',
        label: 'Commission Cover',
        time: 1.5,
        cost: 60,
        cooldownDays: 2,
        progressKey: 'cover',
        log: ({ label }) => `${label} unveiled a shiny cover mockup. Bookstores swoon.`
      },
      {
        id: 'rallyReviews',
        label: 'Rally Reviews',
        time: 1.25,
        cost: 10,
        cooldownDays: 1,
        progressKey: 'reviews',
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
