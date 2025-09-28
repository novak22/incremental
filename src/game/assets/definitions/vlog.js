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

const vlogDefinition = {
  id: 'vlog',
  name: 'Weekly Vlog Channel',
  singular: 'Vlog',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Film upbeat vlogs, edit late-night montages, and ride the algorithmic rollercoaster.',
  setup: { days: 3, hoursPerDay: 4, cost: 180 },
  maintenance: { hours: 1.5, cost: 0 },
  income: { base: 140, variance: 0.35, logType: 'passive' },
  requirements: [{ type: 'equipment', id: 'camera' }],
  messages: {
    setupStarted: label => `${label} is in production! Your storyboard is taped across the wall.`,
    setupProgress: (label, completed, total) => `${label} captured more footage (${completed}/${total} shoot days complete).`,
    setupComplete: label => `${label} premiered! Subscribers binged the episode while you slept.`,
    setupMissed: label => `${label} needed camera time today, but the lens cap never came off.`,
    income: (amount, label) => `${label} raked in $${formatMoney(amount)} from sponsors and mid-rolls.`,
    maintenanceSkipped: label => `${label} skipped its edit session, so the algorithm served someone else.`
  },
  defaultState: { instances: [] }
};

vlogDefinition.details = [
  () => ownedDetail(vlogDefinition),
  () => setupDetail(vlogDefinition),
  () => setupCostDetail(vlogDefinition),
  () => maintenanceDetail(vlogDefinition),
  () => renderAssetRequirementDetail('vlog'),
  () => incomeDetail(vlogDefinition),
  () => latestYieldDetail(vlogDefinition)
];

vlogDefinition.action = buildAssetAction(vlogDefinition, {
  first: 'Launch Vlog Channel',
  repeat: 'Add Another Channel'
});

vlogDefinition.cardState = (_state, card) => updateAssetCardLock('vlog', card);

export default vlogDefinition;
