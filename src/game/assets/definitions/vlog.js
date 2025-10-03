import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';

const vlogDefinition = createAssetDefinition({
  id: 'vlog',
  name: 'Weekly Vlog Channel',
  singular: 'Vlog',
  tag: { label: 'Creative', type: 'passive' },
  tags: ['video', 'visual', 'content', 'studio'],
  description: 'Film upbeat vlogs, edit late-night montages, and ride the algorithmic rollercoaster.',
  setup: { days: 4, hoursPerDay: 4, cost: 420 },
  maintenance: { hours: 1.0, cost: 9 },
  skills: {
    setup: [
      'visual',
      { id: 'editing', weight: 0.5 }
    ]
  },
  income: {
    base: 34,
    variance: 0.2,
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
        level: 0,
        name: 'Camera Shy',
        description: 'Footage trickles in with shaky vlogs and tiny ad pennies.',
        income: { min: 2, max: 5 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Weekly Rhythm',
        description: 'A trio of uploads keeps subscribers checking in.',
        income: { min: 12, max: 20 },
        requirements: { videos: 4 }
      },
      {
        level: 2,
        name: 'Studio Shine',
        description: 'Crisp edits and pacing win over binge-watchers.',
        income: { min: 20, max: 30 },
        requirements: { videos: 10, edits: 4 }
      },
      {
        level: 3,
        name: 'Algorithm Darling',
        description: 'Hyped launches and collaborations unlock viral bursts.',
        income: { min: 32, max: 40 },
        requirements: { videos: 18, edits: 7, promotion: 5 }
      },
      {
        level: 4,
        name: 'Prime Time Partner',
        description: 'Sponsorship suites, editors, and co-hosts keep audiences glued.',
        income: { min: 45, max: 58 },
        requirements: { videos: 26, edits: 11, promotion: 9 }
      },
      {
        level: 5,
        name: 'Network Phenomenon',
        description: 'Streaming deals and global tours make every drop an event.',
        income: { min: 62, max: 82 },
        requirements: { videos: 38, edits: 16, promotion: 14 }
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
