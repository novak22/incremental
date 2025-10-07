import { formatMoney, structuredClone } from '../../../core/helpers.js';
import { hustles as hustleConfigs } from '../../data/economyConfig.js';

const requireHustleConfig = hustleId => {
  const config = hustleConfigs[hustleId];

  if (!config) {
    throw new Error(
      `Missing hustle configuration for "${hustleId}". Add it to src/game/data/economyConfig.js to enable this instant hustle.`
    );
  }

  return config;
};

const freelanceConfig = requireHustleConfig('freelance'); // Spec: docs/normalized_economy.json → hustles.freelance
const audienceCallConfig = requireHustleConfig('audienceCall'); // Spec: docs/normalized_economy.json → hustles.audienceCall
const bundlePushConfig = requireHustleConfig('bundlePush'); // Spec: docs/normalized_economy.json → hustles.bundlePush
const surveySprintConfig = requireHustleConfig('surveySprint'); // Spec: docs/normalized_economy.json → hustles.surveySprint
const dataEntryConfig = requireHustleConfig('dataEntry'); // Spec: docs/normalized_economy.json → hustles.dataEntry
const eventPhotoGigConfig = requireHustleConfig('eventPhotoGig'); // Spec: docs/normalized_economy.json → hustles.eventPhotoGig
const popUpWorkshopConfig = requireHustleConfig('popUpWorkshop'); // Spec: docs/normalized_economy.json → hustles.popUpWorkshop
const vlogEditRushConfig = requireHustleConfig('vlogEditRush'); // Spec: docs/normalized_economy.json → hustles.vlogEditRush
const dropshipPackPartyConfig = requireHustleConfig('dropshipPackParty'); // Spec: docs/normalized_economy.json → hustles.dropshipPackParty
const saasBugSquashConfig = requireHustleConfig('saasBugSquash'); // Spec: docs/normalized_economy.json → hustles.saasBugSquash
const audiobookNarrationConfig = requireHustleConfig('audiobookNarration'); // Spec: docs/normalized_economy.json → hustles.audiobookNarration
const streetPromoSprintConfig = requireHustleConfig('streetPromoSprint'); // Spec: docs/normalized_economy.json → hustles.streetPromoSprint
const virtualAssistantConfig = requireHustleConfig('virtualAssistant'); // Spec: docs/normalized_economy.json → hustles.virtualAssistant

const instantHustleDefinitions = [
  {
    id: 'freelance',
    name: 'Freelance Writing',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
    tags: freelanceConfig.tags,
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
    market: structuredClone(freelanceConfig.market || {}),
    metrics: {
      time: { label: '⚡ Freelance writing time', category: 'hustle' },
      payout: { label: '💼 Freelance writing payout', category: 'hustle' }
    },
    skills: freelanceConfig.skills,
    actionLabel: 'Write Now'
  },
  {
    id: 'audienceCall',
    name: 'Audience Q&A Blast',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Host a 60-minute livestream for your blog readers and pitch a premium checklist.',
    tags: audienceCallConfig.tags,
    time: audienceCallConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.audienceCall.setup_time
    requirements: audienceCallConfig.requirements,
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
    market: structuredClone(audienceCallConfig.market || {}),
    metrics: {
      time: { label: '🎤 Audience Q&A prep', category: 'hustle' },
      payout: { label: '🎤 Audience Q&A payout', category: 'hustle' }
    },
    skills: audienceCallConfig.skills,
    actionLabel: 'Go Live'
  },
  {
    id: 'bundlePush',
    name: 'Bundle Promo Push',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Pair your top blogs with an e-book bonus bundle for a limited-time flash sale.',
    tags: bundlePushConfig.tags,
    time: bundlePushConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.bundlePush.setup_time
    requirements: bundlePushConfig.requirements,
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
    market: structuredClone(bundlePushConfig.market || {}),
    metrics: {
      time: { label: '🧺 Bundle promo planning', category: 'hustle' },
      payout: { label: '🧺 Bundle promo payout', category: 'hustle' }
    },
    skills: bundlePushConfig.skills,
    actionLabel: 'Launch Bundle'
  },
  {
    id: 'surveySprint',
    name: 'Micro Survey Dash',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Knock out a 15-minute feedback survey while your coffee is still warm.',
    tags: surveySprintConfig.tags,
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
    market: structuredClone(surveySprintConfig.market || {}),
    metrics: {
      time: { label: '📝 Survey dash time', category: 'hustle' },
      payout: { label: '🪙 Survey dash payout', category: 'hustle' }
    },
    skills: surveySprintConfig.skills,
    actionLabel: 'Start Survey'
  },
  {
    id: 'dataEntry',
    name: 'Data Entry Blitz',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Power through backlog spreadsheets and tidy catalogs for steady pay.',
    tags: dataEntryConfig.tags,
    time: dataEntryConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.dataEntry.setup_time
    dailyLimit: dataEntryConfig.dailyLimit,
    payout: {
      amount: dataEntryConfig.payout, // Spec: docs/normalized_economy.json → hustles.dataEntry.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? dataEntryConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Spreadsheet superpowers made the auditors swoon.'
          : '';
        return `You tidied backlog data for $${formatMoney(payout)}. Clean rows, calm mind!${bonusNote}`;
      }
    },
    market: structuredClone(dataEntryConfig.market || {}),
    metrics: {
      time: { label: '📊 Data entry focus time', category: 'hustle' },
      payout: { label: '📊 Data entry payout', category: 'hustle' }
    },
    skills: dataEntryConfig.skills,
    actionLabel: 'Log Data Hours'
  },
  {
    id: 'virtualAssistant',
    name: 'Virtual Assistant Shift',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Jump into the shared inbox, tidy calendars, and keep remote workflows humming.',
    tags: virtualAssistantConfig.tags,
    time: virtualAssistantConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.virtualAssistant.setup_time
    dailyLimit: virtualAssistantConfig.dailyLimit,
    payout: {
      amount: virtualAssistantConfig.payout, // Spec: docs/normalized_economy.json → hustles.virtualAssistant.base_income
      logType: 'hustle',
      message: context => {
        const payout = context?.finalPayout ?? context?.payoutGranted ?? virtualAssistantConfig.payout;
        const bonusNote = context?.appliedEducationBoosts?.length
          ? ' Systems savvy made every update sparkle.'
          : '';
        return `You kept the ops humming for $${formatMoney(payout)}. Remote magic for the win!${bonusNote}`;
      }
    },
    market: structuredClone(virtualAssistantConfig.market || {}),
    metrics: {
      time: { label: '🧰 Virtual assistant focus time', category: 'hustle' },
      payout: { label: '🧰 Virtual assistant payout', category: 'hustle' }
    },
    skills: virtualAssistantConfig.skills,
    actionLabel: 'Assist Remotely'
  },
  {
    id: 'eventPhotoGig',
    name: 'Event Photo Gig',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Grab your gallery gear and capture candid magic at a pop-up showcase.',
    tags: eventPhotoGigConfig.tags,
    time: eventPhotoGigConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.eventPhotoGig.setup_time
    requirements: eventPhotoGigConfig.requirements,
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
    market: structuredClone(eventPhotoGigConfig.market || {}),
    metrics: {
      time: { label: '📸 Event shoot time', category: 'hustle' },
      payout: { label: '📸 Event shoot payout', category: 'hustle' }
    },
    skills: eventPhotoGigConfig.skills,
    actionLabel: 'Pack the Camera Bag'
  },
  {
    id: 'popUpWorkshop',
    name: 'Pop-Up Workshop',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Host a cozy crash course that blends your blog insights with e-book handouts.',
    tags: popUpWorkshopConfig.tags,
    time: popUpWorkshopConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.popUpWorkshop.setup_time
    requirements: popUpWorkshopConfig.requirements,
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
    market: structuredClone(popUpWorkshopConfig.market || {}),
    metrics: {
      time: { label: '🎓 Workshop facilitation', category: 'hustle' },
      payout: { label: '🎓 Workshop payout', category: 'hustle' }
    },
    skills: popUpWorkshopConfig.skills,
    actionLabel: 'Set the Agenda'
  },
  {
    id: 'vlogEditRush',
    name: 'Vlog Edit Rush',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Slice, color, and caption a backlog vlog episode for a partner channel.',
    tags: vlogEditRushConfig.tags,
    time: vlogEditRushConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.vlogEditRush.setup_time
    requirements: vlogEditRushConfig.requirements,
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
    market: structuredClone(vlogEditRushConfig.market || {}),
    metrics: {
      time: { label: '🎬 Vlog edit time', category: 'hustle' },
      payout: { label: '🎬 Vlog edit payout', category: 'hustle' }
    },
    skills: vlogEditRushConfig.skills,
    actionLabel: 'Launch Edit Sprint'
  },
  {
    id: 'dropshipPackParty',
    name: 'Dropship Pack Party',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Bundle hot orders with branded tissue paper and a confetti of thank-you notes.',
    tags: dropshipPackPartyConfig.tags,
    time: dropshipPackPartyConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.dropshipPackParty.setup_time
    cost: dropshipPackPartyConfig.cost, // Spec: docs/normalized_economy.json → hustles.dropshipPackParty.setup_cost
    requirements: dropshipPackPartyConfig.requirements,
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
    market: structuredClone(dropshipPackPartyConfig.market || {}),
    metrics: {
      time: { label: '📦 Packing party time', category: 'hustle' },
      cost: { label: '📦 Packing party supplies', category: 'investment' },
      payout: { label: '📦 Packing party payout', category: 'hustle' }
    },
    skills: dropshipPackPartyConfig.skills,
    actionLabel: 'Queue Shipments'
  },
  {
    id: 'saasBugSquash',
    name: 'SaaS Bug Squash',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Dig through error logs and deploy a patch before support tickets pile up.',
    tags: saasBugSquashConfig.tags,
    time: saasBugSquashConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.saasBugSquash.setup_time
    requirements: saasBugSquashConfig.requirements,
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
    market: structuredClone(saasBugSquashConfig.market || {}),
    metrics: {
      time: { label: '🧰 Bug fix time', category: 'hustle' },
      payout: { label: '🧰 Bug fix payout', category: 'hustle' }
    },
    skills: saasBugSquashConfig.skills,
    actionLabel: 'Patch the Glitch'
  },
  {
    id: 'audiobookNarration',
    name: 'Audiobook Narration',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Record a silky-smooth sample chapter to hype your flagship e-book series.',
    tags: audiobookNarrationConfig.tags,
    time: audiobookNarrationConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.audiobookNarration.setup_time
    requirements: audiobookNarrationConfig.requirements,
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
    market: structuredClone(audiobookNarrationConfig.market || {}),
    metrics: {
      time: { label: '🎙️ Narration booth time', category: 'hustle' },
      payout: { label: '🎙️ Narration payout', category: 'hustle' }
    },
    skills: audiobookNarrationConfig.skills,
    actionLabel: 'Warm Up Vocals'
  },
  {
    id: 'streetPromoSprint',
    name: 'Street Team Promo',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Hand out QR stickers at a pop-up market to funnel readers toward your latest drops.',
    tags: streetPromoSprintConfig.tags,
    time: streetPromoSprintConfig.timeHours, // Spec: docs/normalized_economy.json → hustles.streetPromoSprint.setup_time
    cost: streetPromoSprintConfig.cost, // Spec: docs/normalized_economy.json → hustles.streetPromoSprint.setup_cost
    requirements: streetPromoSprintConfig.requirements,
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
    market: structuredClone(streetPromoSprintConfig.market || {}),
    metrics: {
      time: { label: '🚀 Street promo time', category: 'hustle' },
      cost: { label: '🚀 Street promo stickers', category: 'investment' },
      payout: { label: '🚀 Street promo payout', category: 'hustle' }
    },
    skills: streetPromoSprintConfig.skills,
    actionLabel: 'Deploy Street Team'
  }
];

export function getInstantHustleDefinitions() {
  return instantHustleDefinitions;
}
