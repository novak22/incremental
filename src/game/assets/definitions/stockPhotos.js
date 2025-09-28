import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
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
  income: { base: 95, variance: 0.45, logType: 'passive' },
  requirements: [
    { type: 'equipment', id: 'camera' },
    { type: 'equipment', id: 'studio' },
    { type: 'knowledge', id: 'photoLibrary' }
  ],
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
  () => incomeDetail(stockPhotosDefinition),
  () => latestYieldDetail(stockPhotosDefinition)
];

stockPhotosDefinition.action = buildAssetAction(stockPhotosDefinition, {
  first: 'Curate Gallery',
  repeat: 'Add New Gallery'
});

stockPhotosDefinition.cardState = (_state, card) => updateAssetCardLock('stockPhotos', card);

export default stockPhotosDefinition;
