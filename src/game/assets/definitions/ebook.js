import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  setupCostDetail,
  setupDetail
} from '../helpers.js';
import { renderAssetRequirementDetail, updateAssetCardLock } from '../../requirements.js';

const ebookDefinition = {
  id: 'ebook',
  name: 'Digital E-Book Series',
  singular: 'E-Book',
  tag: { label: 'Knowledge', type: 'passive' },
  description: 'Package your expertise into downloadable page-turners that sell while you snooze.',
  setup: { days: 4, hoursPerDay: 3, cost: 60 },
  maintenance: { hours: 0.5, cost: 0 },
  income: { base: 120, variance: 0.3, logType: 'passive' },
  requirements: [{ type: 'knowledge', id: 'outlineMastery' }],
  messages: {
    setupStarted: label => `${label} outline is locked! Next up: polishing chapters and cover art.`,
    setupProgress: (label, completed, total) => `${label} drafting sprint is ${completed}/${total} days complete.`,
    setupComplete: label => `${label} launched! Readers are devouring chapters on every device.`,
    setupMissed: label => `${label} missed its writing block today, so progress stayed flat.`,
    income: (amount, label) => `${label} sold bundles worth $${formatMoney(amount)} today.`,
    maintenanceSkipped: label => `${label} skipped promo pushes, so the sales funnel dried up.`
  },
  defaultState: { instances: [] }
};

ebookDefinition.details = [
  () => ownedDetail(ebookDefinition),
  () => setupDetail(ebookDefinition),
  () => setupCostDetail(ebookDefinition),
  () => maintenanceDetail(ebookDefinition),
  () => renderAssetRequirementDetail('ebook'),
  () => incomeDetail(ebookDefinition),
  () => latestYieldDetail(ebookDefinition)
];

ebookDefinition.action = buildAssetAction(ebookDefinition, {
  first: 'Author First E-Book',
  repeat: 'Write Another Volume'
});

ebookDefinition.cardState = (_state, card) => updateAssetCardLock('ebook', card);

export default ebookDefinition;
