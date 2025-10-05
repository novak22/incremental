import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const vlogConfig = assetConfigs.vlog; // Spec: docs/normalized_economy.json → assets.vlog
const vlogSetup = vlogConfig.setup; // Spec: docs/normalized_economy.json → assets.vlog.schedule
const vlogMaintenance = vlogConfig.maintenance; // Spec: docs/normalized_economy.json → assets.vlog.maintenance_time
const vlogIncome = vlogConfig.income; // Spec: docs/normalized_economy.json → assets.vlog.base_income
const [
  vlogQualityLevel0,
  vlogQualityLevel1,
  vlogQualityLevel2,
  vlogQualityLevel3,
  vlogQualityLevel4,
  vlogQualityLevel5
] = vlogConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.vlog.quality_curve

const vlogDefinition = createAssetDefinition({
  id: 'vlog',
  name: 'Weekly Vlog Channel',
  singular: 'Vlog',
  tag: { label: 'Creative', type: 'passive' },
  tags: ['video', 'visual', 'content', 'studio'],
  description: 'Film upbeat vlogs, edit late-night montages, and ride the algorithmic rollercoaster.',
  setup: { ...vlogSetup },
  maintenance: { ...vlogMaintenance },
  skills: {
    setup: [
      'visual',
      { id: 'editing', weight: 0.5 }
    ]
  },
  income: {
    ...vlogIncome, // Spec: docs/normalized_economy.json → assets.vlog.base_income
    logType: 'passive'
  },
  requirements: {
    equipment: ['camera']
  },
  quality: {
    summary: 'Film episodes, polish edits, and promote premieres to unlock higher quality payouts and viral chances.',
    tracks: {
      videos: { label: 'Episodes filmed', shortLabel: 'episodes' },
      edits: { label: 'Editing upgrades', shortLabel: 'edits' },
      promotion: { label: 'Promo pushes', shortLabel: 'promo pushes' }
    },
    levels: [
      {
        level: vlogQualityLevel0.level,
        name: 'Camera Shy',
        description: 'Footage trickles in with shaky vlogs and tiny ad pennies.',
        income: { ...vlogQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[0]
        requirements: { ...vlogQualityLevel0.requirements }
      },
      {
        level: vlogQualityLevel1.level,
        name: 'Weekly Rhythm',
        description: 'A trio of uploads keeps subscribers checking in.',
        income: { ...vlogQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[1]
        requirements: { ...vlogQualityLevel1.requirements }
      },
      {
        level: vlogQualityLevel2.level,
        name: 'Studio Shine',
        description: 'Crisp edits and pacing win over binge-watchers.',
        income: { ...vlogQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[2]
        requirements: { ...vlogQualityLevel2.requirements }
      },
      {
        level: vlogQualityLevel3.level,
        name: 'Algorithm Darling',
        description: 'Hyped launches and collaborations unlock viral bursts.',
        income: { ...vlogQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[3]
        requirements: { ...vlogQualityLevel3.requirements }
      },
      {
        level: vlogQualityLevel4.level,
        name: 'Prime Time Partner',
        description: 'Sponsorship suites, editors, and co-hosts keep audiences glued.',
        income: { ...vlogQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[4]
        requirements: { ...vlogQualityLevel4.requirements }
      },
      {
        level: vlogQualityLevel5.level,
        name: 'Network Phenomenon',
        description: 'Streaming deals and global tours make every drop an event.',
        income: { ...vlogQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.vlog.quality_curve[5]
        requirements: { ...vlogQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'shootEpisode',
        label: 'Film Episode',
        time: 5,
        dailyLimit: 1,
        progressKey: 'videos',
        progressAmount: () => 1,
        skills: ['visual'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} filmed an energetic episode. B-roll glitter everywhere!`
      },
      {
        id: 'polishEdit',
        label: 'Polish Edit',
        time: 2.5,
        cost: 16,
        dailyLimit: 1,
        progressKey: 'edits',
        progressAmount: () => 1,
        skills: ['editing'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} tightened jump cuts and color graded every frame.`
      },
      {
        id: 'hypePush',
        label: 'Promo Blast',
        time: 2,
        cost: 24,
        dailyLimit: 1,
        progressKey: 'promotion',
        progressAmount: () => 1,
        skills: ['promotion'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
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
    first: 'Launch Vlog Channel',
    repeat: 'Add Another Channel'
  }
});

export default vlogDefinition;
