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
  setup: { days: 4, hoursPerDay: 2.5, cost: 240 },
  maintenance: { hours: 1, cost: 4 },
  income: {
    base: 28,
    variance: 0.2,
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
        income: { min: 3, max: 6 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Fresh Packs',
        description: 'Multiple themed packs attract steady design searches.',
        income: { min: 10, max: 16 },
        requirements: { packs: 5 }
      },
      {
        level: 2,
        name: 'Tagged Treasure',
        description: 'Meticulous keywords vault photos to top results.',
        income: { min: 18, max: 26 },
        requirements: { packs: 11, keywords: 5 }
      },
      {
        level: 3,
        name: 'Marketplace Darling',
        description: 'Partnerships and outreach keep royalties compounding.',
        income: { min: 26, max: 36 },
        requirements: { packs: 18, keywords: 9, outreach: 5 }
      }
    ],
    actions: [
      {
        id: 'shootPack',
        label: 'Shoot Pack',
        time: 3.5,
        progressKey: 'packs',
        log: ({ label }) => `${label} captured a fresh themed pack. Lightroom presets sparkle!`
      },
      {
        id: 'keywordSession',
        label: 'Keyword Session',
        time: 1.5,
        cost: 8,
        progressKey: 'keywords',
        log: ({ label }) => `${label} tagged every shot with laser-focused keywords.`
      },
      {
        id: 'portfolioOutreach',
        label: 'Pitch Marketplace',
        time: 2,
        cost: 18,
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
