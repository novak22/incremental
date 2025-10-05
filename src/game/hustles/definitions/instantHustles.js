import { formatMoney } from '../../../core/helpers.js';
import {
  AUDIENCE_CALL_REQUIREMENTS,
  BUNDLE_PUSH_REQUIREMENTS,
  EVENT_PHOTO_REQUIREMENTS,
  WORKSHOP_REQUIREMENTS,
  EDIT_RUSH_REQUIREMENTS,
  PACK_PARTY_REQUIREMENTS,
  BUG_SQUASH_REQUIREMENTS,
  NARRATION_REQUIREMENTS,
  STREET_PROMO_REQUIREMENTS
} from '../helpers.js';
import { hustles as hustleConfigs } from '../../data/economyConfig.js';

const freelanceConfig = hustleConfigs.freelance; // Spec: docs/normalized_economy.json → hustles.freelance
const audienceCallConfig = hustleConfigs.audienceCall; // Spec: docs/normalized_economy.json → hustles.audienceCall
const bundlePushConfig = hustleConfigs.bundlePush; // Spec: docs/normalized_economy.json → hustles.bundlePush
const surveySprintConfig = hustleConfigs.surveySprint; // Spec: docs/normalized_economy.json → hustles.surveySprint
const eventPhotoGigConfig = hustleConfigs.eventPhotoGig; // Spec: docs/normalized_economy.json → hustles.eventPhotoGig
const popUpWorkshopConfig = hustleConfigs.popUpWorkshop; // Spec: docs/normalized_economy.json → hustles.popUpWorkshop
const vlogEditRushConfig = hustleConfigs.vlogEditRush; // Spec: docs/normalized_economy.json → hustles.vlogEditRush
const dropshipPackPartyConfig = hustleConfigs.dropshipPackParty; // Spec: docs/normalized_economy.json → hustles.dropshipPackParty
const saasBugSquashConfig = hustleConfigs.saasBugSquash; // Spec: docs/normalized_economy.json → hustles.saasBugSquash
const audiobookNarrationConfig = hustleConfigs.audiobookNarration; // Spec: docs/normalized_economy.json → hustles.audiobookNarration
const streetPromoSprintConfig = hustleConfigs.streetPromoSprint; // Spec: docs/normalized_economy.json → hustles.streetPromoSprint

const instantHustleDefinitions = [
  {
    id: 'freelance',
    name: 'Freelance Writing',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
    tags: ['writing', 'desktop_work'],
    time: freelanceConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.freelance.setup_time
    payout: {
      amount: freelanceConfig.payout, // Spec: docs/normalized_economy.json → hustles.freelance.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? freelanceConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Your storytelling drills juiced the rate!'
          : '';
        return `You hustled an article for $${formatMoney(payout)}. Not Pulitzer material, but it pays the bills!${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '⚡ Freelance writing time', category: 'hustle' },
      payout: { label: '💼 Freelance writing payout', category: 'hustle' }
    },
    skills: ['writing'],
    actionLabel: 'Write Now'
  },
  {
    id: 'audienceCall',
    name: 'Audience Q&A Blast',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Host a 60-minute livestream for your blog readers and pitch a premium checklist.',
    tags: ['community', 'live', 'video'],
    time: audienceCallConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.audienceCall.setup_time
    requirements: AUDIENCE_CALL_REQUIREMENTS,
    dailyLimit: audienceCallConfig.dailyLimit, // Spec: docs/normalized_economy.json → hustles.audienceCall.daily_limit
    payout: {
      amount: audienceCallConfig.payout, // Spec: docs/normalized_economy.json → hustles.audienceCall.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? audienceCallConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Spotlight-ready banter brought in extra tips.'
          : '';
        return `Your audience Q&A tipped $${formatMoney(payout)} in template sales. Small wins add up!${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🎤 Audience Q&A prep', category: 'hustle' },
      payout: { label: '🎤 Audience Q&A payout', category: 'hustle' }
    },
    skills: ['audience'],
    actionLabel: 'Go Live'
  },
  {
    id: 'bundlePush',
    name: 'Bundle Promo Push',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Pair your top blogs with an e-book bonus bundle for a limited-time flash sale.',
    tags: ['commerce', 'marketing'],
    time: bundlePushConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.bundlePush.setup_time
    requirements: BUNDLE_PUSH_REQUIREMENTS,
    payout: {
      amount: bundlePushConfig.payout, // Spec: docs/normalized_economy.json → hustles.bundlePush.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? bundlePushConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Funnel math mastery made every upsell sparkle.'
          : '';
        return `Your flash bundle moved $${formatMoney(payout)} in upsells. Subscribers love the combo!${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🧺 Bundle promo planning', category: 'hustle' },
      payout: { label: '🧺 Bundle promo payout', category: 'hustle' }
    },
    skills: ['promotion'],
    actionLabel: 'Launch Bundle'
  },
  {
    id: 'surveySprint',
    name: 'Micro Survey Dash',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Knock out a 15-minute feedback survey while your coffee is still warm.',
    tags: ['ops', 'desktop_work'],
    time: surveySprintConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.surveySprint.setup_time
    dailyLimit: surveySprintConfig.dailyLimit, // Spec: docs/normalized_economy.json → hustles.surveySprint.daily_limit
    payout: {
      amount: surveySprintConfig.payout, // Spec: docs/normalized_economy.json → hustles.surveySprint.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? surveySprintConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Guerrilla research savvy bumped the stipend.'
          : '';
        return `You breezed through a micro survey for $${formatMoney(payout)}. It all counts toward the dream!${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '📝 Survey dash time', category: 'hustle' },
      payout: { label: '🪙 Survey dash payout', category: 'hustle' }
    },
    skills: ['research'],
    actionLabel: 'Start Survey'
  },
  {
    id: 'eventPhotoGig',
    name: 'Event Photo Gig',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Grab your gallery gear and capture candid magic at a pop-up showcase.',
    tags: ['photo', 'shoot', 'studio'],
    time: eventPhotoGigConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.eventPhotoGig.setup_time
    requirements: EVENT_PHOTO_REQUIREMENTS,
    payout: {
      amount: eventPhotoGigConfig.payout, // Spec: docs/normalized_economy.json → hustles.eventPhotoGig.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? eventPhotoGigConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Curated portfolios impressed every client.'
          : '';
        return `Your lenses caught the event buzz! $${formatMoney(payout)} in photo packages just dropped.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '📸 Event shoot time', category: 'hustle' },
      payout: { label: '📸 Event shoot payout', category: 'hustle' }
    },
    skills: ['visual'],
    actionLabel: 'Pack the Camera Bag'
  },
  {
    id: 'popUpWorkshop',
    name: 'Pop-Up Workshop',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Host a cozy crash course that blends your blog insights with e-book handouts.',
    tags: ['education', 'in_person'],
    time: popUpWorkshopConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.popUpWorkshop.setup_time
    requirements: WORKSHOP_REQUIREMENTS,
    payout: {
      amount: popUpWorkshopConfig.payout, // Spec: docs/normalized_economy.json → hustles.popUpWorkshop.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? popUpWorkshopConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Teaching polish turned browsers into buyers.'
          : '';
        return `Your pop-up workshop wrapped with $${formatMoney(payout)} in sign-ups and smiling grads.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🎓 Workshop facilitation', category: 'hustle' },
      payout: { label: '🎓 Workshop payout', category: 'hustle' }
    },
    skills: ['audience', { id: 'writing', weight: 0.5 }],
    actionLabel: 'Set the Agenda'
  },
  {
    id: 'vlogEditRush',
    name: 'Vlog Edit Rush',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Slice, color, and caption a backlog vlog episode for a partner channel.',
    tags: ['video', 'editing', 'desktop_work'],
    time: vlogEditRushConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.vlogEditRush.setup_time
    requirements: EDIT_RUSH_REQUIREMENTS,
    payout: {
      amount: vlogEditRushConfig.payout, // Spec: docs/normalized_economy.json → hustles.vlogEditRush.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? vlogEditRushConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Post-production precision shaved hours off the deadline.'
          : '';
        return `You polished a collab vlog for $${formatMoney(payout)}. Their subscribers are already bingeing!${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🎬 Vlog edit time', category: 'hustle' },
      payout: { label: '🎬 Vlog edit payout', category: 'hustle' }
    },
    skills: ['editing'],
    actionLabel: 'Launch Edit Sprint'
  },
  {
    id: 'dropshipPackParty',
    name: 'Dropship Pack Party',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Bundle hot orders with branded tissue paper and a confetti of thank-you notes.',
    tags: ['commerce', 'fulfillment'],
    time: dropshipPackPartyConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.dropshipPackParty.setup_time
    cost: dropshipPackPartyConfig.cost, // Spec: docs/normalized_economy.json → hustles.dropshipPackParty.setup_cost
    requirements: PACK_PARTY_REQUIREMENTS,
    payout: {
      amount: dropshipPackPartyConfig.payout, // Spec: docs/normalized_economy.json → hustles.dropshipPackParty.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? dropshipPackPartyConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Logistics drills kept the conveyor humming.'
          : '';
        return `Packing party complete! $${formatMoney(payout)} cleared after shipping labels and sparkle tape.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '📦 Packing party time', category: 'hustle' },
      cost: { label: '📦 Packing party supplies', category: 'investment' },
      payout: { label: '📦 Packing party payout', category: 'hustle' }
    },
    skills: ['commerce'],
    actionLabel: 'Queue Shipments'
  },
  {
    id: 'saasBugSquash',
    name: 'SaaS Bug Squash',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Dig through error logs and deploy a patch before support tickets pile up.',
    tags: ['software', 'ops'],
    time: saasBugSquashConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.saasBugSquash.setup_time
    requirements: BUG_SQUASH_REQUIREMENTS,
    payout: {
      amount: saasBugSquashConfig.payout, // Spec: docs/normalized_economy.json → hustles.saasBugSquash.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? saasBugSquashConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Architectural insights made debugging a breeze.'
          : '';
        return `Customers cheered your hotfix! $${formatMoney(payout)} in retention credits landed instantly.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🧰 Bug fix time', category: 'hustle' },
      payout: { label: '🧰 Bug fix payout', category: 'hustle' }
    },
    skills: ['software', { id: 'infrastructure', weight: 0.5 }],
    actionLabel: 'Patch the Glitch'
  },
  {
    id: 'audiobookNarration',
    name: 'Audiobook Narration',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Record a silky-smooth sample chapter to hype your flagship e-book series.',
    tags: ['audio', 'studio'],
    time: audiobookNarrationConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.audiobookNarration.setup_time
    requirements: NARRATION_REQUIREMENTS,
    payout: {
      amount: audiobookNarrationConfig.payout, // Spec: docs/normalized_economy.json → hustles.audiobookNarration.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? audiobookNarrationConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Narrative confidence kept the script soaring.'
          : '';
        return `Your narration melted ears and earned $${formatMoney(payout)} in audio bundle preorders.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🎙️ Narration booth time', category: 'hustle' },
      payout: { label: '🎙️ Narration payout', category: 'hustle' }
    },
    skills: ['audio'],
    actionLabel: 'Warm Up Vocals'
  },
  {
    id: 'streetPromoSprint',
    name: 'Street Team Promo',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Hand out QR stickers at a pop-up market to funnel readers toward your latest drops.',
    tags: ['marketing', 'field'],
    time: streetPromoSprintConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.streetPromoSprint.setup_time
    cost: streetPromoSprintConfig.cost, // Spec: docs/normalized_economy.json → hustles.streetPromoSprint.setup_cost
    requirements: STREET_PROMO_REQUIREMENTS,
    payout: {
      amount: streetPromoSprintConfig.payout, // Spec: docs/normalized_economy.json → hustles.streetPromoSprint.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? streetPromoSprintConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Guerrilla tactics drew a bigger crowd.'
          : '';
        return `Your sticker swarm paid off! $${formatMoney(payout)} in rush sales chimed in on the go.${bonusNote}`;
      }
    },
    metrics: {
      time: { label: '🚀 Street promo time', category: 'hustle' },
      cost: { label: '🚀 Street promo stickers', category: 'investment' },
      payout: { label: '🚀 Street promo payout', category: 'hustle' }
    },
    skills: ['promotion'],
    actionLabel: 'Deploy Street Team'
  }
];

export function getInstantHustleDefinitions() {
  return instantHustleDefinitions;
}
