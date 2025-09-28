import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
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
  maintenance: { hours: 1.5, cost: 5 },
  income: {
    base: 200,
    variance: 0.3,
    logType: 'passive',
    modifier: (amount, { instance }) => {
      const qualityLevel = instance?.quality?.level || 0;
      if (qualityLevel >= 3 && Math.random() < 0.18) {
        return Math.round(amount * 3);
      }
      return amount;
    }
  },
  requirements: [{ type: 'equipment', id: 'camera' }],
  quality: {
    summary: 'Film episodes, polish edits, and promote premieres to unlock higher quality payouts and viral chances.',
    tracks: {
      videos: { label: 'Episodes filmed', shortLabel: 'episodes' },
      edits: { label: 'Editing upgrades', shortLabel: 'edits' },
      promotion: { label: 'Promo pushes', shortLabel: 'promo pushes' }
    },
    levels: [
      {
        level: 0,
        name: 'Camera Shy',
        description: 'Footage trickles in with shaky vlogs and tiny ad pennies.',
        income: { min: 2, max: 6 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Weekly Rhythm',
        description: 'A trio of uploads keeps subscribers checking in.',
        income: { min: 35, max: 60 },
        requirements: { videos: 3 }
      },
      {
        level: 2,
        name: 'Studio Shine',
        description: 'Crisp edits and pacing win over binge-watchers.',
        income: { min: 80, max: 140 },
        requirements: { videos: 7, edits: 3 }
      },
      {
        level: 3,
        name: 'Algorithm Darling',
        description: 'Hyped launches and collaborations unlock viral bursts.',
        income: { min: 150, max: 260 },
        requirements: { videos: 12, edits: 6, promotion: 3 }
      }
    ],
    actions: [
      {
        id: 'shootEpisode',
        label: 'Film Episode',
        time: 4,
        progressKey: 'videos',
        log: ({ label }) => `${label} filmed an energetic episode. B-roll glitter everywhere!`
      },
      {
        id: 'polishEdit',
        label: 'Polish Edit',
        time: 2,
        cost: 10,
        progressKey: 'edits',
        log: ({ label }) => `${label} tightened jump cuts and color graded every frame.`
      },
      {
        id: 'hypePush',
        label: 'Promo Blast',
        time: 1.5,
        cost: 18,
        progressKey: 'promotion',
        log: ({ label }) => `${label} teased the drop on socials. Chat bubbles explode with hype!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} is now Quality ${level}! ${levelDef?.name || 'New buzz'} unlocks juicier sponsorships.`
    }
  },
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
  () => qualitySummaryDetail(vlogDefinition),
  () => qualityProgressDetail(vlogDefinition),
  () => incomeDetail(vlogDefinition),
  () => latestYieldDetail(vlogDefinition)
];

vlogDefinition.action = buildAssetAction(vlogDefinition, {
  first: 'Launch Vlog Channel',
  repeat: 'Add Another Channel'
});

vlogDefinition.cardState = (_state, card) => updateAssetCardLock('vlog', card);

export default vlogDefinition;
