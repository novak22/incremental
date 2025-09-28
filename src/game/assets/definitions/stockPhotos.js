import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
  setupDetail
} from '../helpers.js';
import { renderAssetRequirementDetail, updateAssetCardLock } from '../../requirements.js';

const stockPhotosDefinition = {
  id: 'stockPhotos',
  name: 'Stock Photo Gallery',
  singular: 'Gallery',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Curate vibrant photo packs that designers license in surprising numbers.',
  setup: { days: 3, hoursPerDay: 2, cost: 0 },
  maintenance: { hours: 1, cost: 0 },
  income: {
    base: 140,
    variance: 0.35,
    logType: 'passive'
  },
  requirements: [
    { type: 'equipment', id: 'camera' },
    { type: 'equipment', id: 'studio' },
    { type: 'knowledge', id: 'photoLibrary' }
  ],
  quality: {
    summary: 'Shoot new packs, keyword diligently, and pitch marketplaces so galleries enjoy evergreen demand.',
    tracks: {
      packs: { label: 'Photo packs', shortLabel: 'packs' },
      keywords: { label: 'Keyword sessions', shortLabel: 'keywords' },
      outreach: { label: 'Marketplace outreach', shortLabel: 'outreach' }
    },
    levels: [
      {
        level: 0,
        name: 'Dusty Portfolio',
        description: 'A tiny gallery with generic tags earns a trickle.',
        income: { min: 4, max: 8 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Fresh Packs',
        description: 'Multiple themed packs attract steady design searches.',
        income: { min: 12, max: 24 },
        requirements: { packs: 4 }
      },
      {
        level: 2,
        name: 'Tagged Treasure',
        description: 'Meticulous keywords vault photos to top results.',
        income: { min: 30, max: 60 },
        requirements: { packs: 9, keywords: 4 }
      },
      {
        level: 3,
        name: 'Marketplace Darling',
        description: 'Partnerships and outreach keep royalties compounding.',
        income: { min: 70, max: 140 },
        requirements: { packs: 15, keywords: 8, outreach: 3 }
      }
    ],
    actions: [
      {
        id: 'shootPack',
        label: 'Shoot Pack',
        time: 2.5,
        progressKey: 'packs',
        log: ({ label }) => `${label} captured a fresh themed pack. Lightroom presets sparkle!`
      },
      {
        id: 'keywordSession',
        label: 'Keyword Session',
        time: 1,
        cost: 5,
        progressKey: 'keywords',
        log: ({ label }) => `${label} tagged every shot with laser-focused keywords.`
      },
      {
        id: 'portfolioOutreach',
        label: 'Pitch Marketplace',
        time: 1.5,
        cost: 12,
        progressKey: 'outreach',
        log: ({ label }) => `${label} pitched new bundles to marketplaces. Visibility surges!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} blossomed to Quality ${level}! ${levelDef?.name || 'New spotlight'} opens stronger long-tail sales.`
    }
  },
  messages: {
    setupStarted: label => `${label} scouting trip kicked off—lens caps off and inspiration flowing.`,
    setupProgress: (label, completed, total) => `${label} catalogued more shots (${completed}/${total} curation days done).`,
    setupComplete: label => `${label} went live! Designers are licensing your crisp shots already.`,
    setupMissed: label => `${label} needed fresh captures today, but the skies stayed figuratively dark.`,
    income: (amount, label) => `${label} licensed imagery worth $${formatMoney(amount)} today.`,
    maintenanceSkipped: label => `${label} skipped tagging and lost marketplace visibility.`
  },
  defaultState: { instances: [] }
};

stockPhotosDefinition.details = [
  () => ownedDetail(stockPhotosDefinition),
  () => setupDetail(stockPhotosDefinition),
  () => maintenanceDetail(stockPhotosDefinition),
  () => renderAssetRequirementDetail('stockPhotos'),
  () => qualitySummaryDetail(stockPhotosDefinition),
  () => qualityProgressDetail(stockPhotosDefinition),
  () => incomeDetail(stockPhotosDefinition),
  () => latestYieldDetail(stockPhotosDefinition)
];

stockPhotosDefinition.action = buildAssetAction(stockPhotosDefinition, {
  first: 'Curate Gallery',
  repeat: 'Add New Gallery'
});

stockPhotosDefinition.cardState = (_state, card) => updateAssetCardLock('stockPhotos', card);

export default stockPhotosDefinition;
