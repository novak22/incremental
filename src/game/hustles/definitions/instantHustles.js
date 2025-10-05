import { formatMoney } from '../../../core/helpers.js';
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
    market: {
      slotsPerRoll: 2,
      maxActive: 4,
      metadata: {
        requirements: { hours: freelanceConfig.timeHours },
        payout: { amount: freelanceConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: freelanceConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Write the commissioned piece'
      },
      variants: [
        {
          id: 'freelance-rush',
          label: 'Same-Day Draft',
          description: 'Turn a trending request into a polished rush article before the news cycle flips.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: freelanceConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: freelanceConfig.timeHours },
            hoursPerDay: freelanceConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Draft the rush article'
          }
        },
        {
          id: 'freelance-series',
          label: 'Three-Part Mini Series',
          description: 'Outline, draft, and polish a three-installment story arc for a premium client.',
          durationDays: 2,
          metadata: {
            payoutAmount: Math.round(freelanceConfig.payout * 2.5),
            payoutSchedule: 'onCompletion',
            requirements: { hours: freelanceConfig.timeHours * 3 },
            hoursPerDay: freelanceConfig.timeHours,
            daysRequired: 3,
            progressLabel: 'Outline and polish the mini-series'
          }
        },
        {
          id: 'freelance-retainer',
          label: 'Weekly Retainer Columns',
          description: 'Keep a subscriber base buzzing with a full week of evergreen columns.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 80,
            payoutSchedule: 'onCompletion',
            requirements: { hours: freelanceConfig.timeHours * 4 },
            hoursPerDay: freelanceConfig.timeHours,
            daysRequired: 4,
            progressLabel: 'Deliver the retainer lineup'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 3,
      metadata: {
        requirements: { hours: audienceCallConfig.timeHours },
        payout: { amount: audienceCallConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: audienceCallConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Host the Q&A stream'
      },
      variants: [
        {
          id: 'audience-flash',
          label: 'Flash AMA',
          description: 'Stage a quick Q&A for superfans during the lunch break rush.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: audienceCallConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: audienceCallConfig.timeHours },
            hoursPerDay: audienceCallConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Host the flash AMA'
          }
        },
        {
          id: 'audience-series',
          label: 'Mini Workshop Series',
          description: 'Break a dense topic into two cozy livestreams with downloadable extras.',
          durationDays: 1,
          metadata: {
            payoutAmount: 24,
            payoutSchedule: 'onCompletion',
            requirements: { hours: audienceCallConfig.timeHours * 2 },
            hoursPerDay: audienceCallConfig.timeHours,
            daysRequired: 2,
            progressLabel: 'Run the mini workshop series'
          }
        },
        {
          id: 'audience-cohort',
          label: 'Community Coaching Cohort',
          description: 'Coach a private cohort through deep-dive Q&A sessions across the week.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 40,
            payoutSchedule: 'onCompletion',
            requirements: { hours: audienceCallConfig.timeHours * 4 },
            hoursPerDay: audienceCallConfig.timeHours * 1.5,
            daysRequired: 3,
            progressLabel: 'Coach the cohort Q&A'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 3,
      metadata: {
        requirements: { hours: bundlePushConfig.timeHours },
        payout: { amount: bundlePushConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: bundlePushConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Bundle the featured offer'
      },
      variants: [
        {
          id: 'bundle-flash',
          label: 'Flash Sale Blast',
          description: 'Pair blog hits with a one-day bonus bundle and shout it across every channel.',
          durationDays: 0,
          metadata: {
            payoutAmount: bundlePushConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: bundlePushConfig.timeHours },
            hoursPerDay: bundlePushConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Run the flash sale blast'
          }
        },
        {
          id: 'bundle-roadshow',
          label: 'Cross-Promo Roadshow',
          description: 'Spin up a three-day partner push with curated bundles for every audience segment.',
          durationDays: 2,
          metadata: {
            payoutAmount: 72,
            payoutSchedule: 'onCompletion',
            requirements: { hours: bundlePushConfig.timeHours * 2.4 },
            hoursPerDay: 2,
            daysRequired: 3,
            progressLabel: 'Host the cross-promo roadshow'
          }
        },
        {
          id: 'bundle-evergreen',
          label: 'Evergreen Funnel Revamp',
          description: 'Refine the evergreen funnel, swap testimonials, and refresh every automated upsell.',
          availableAfterDays: 1,
          durationDays: 4,
          metadata: {
            payoutAmount: 120,
            payoutSchedule: 'onCompletion',
            requirements: { hours: bundlePushConfig.timeHours * 5 },
            hoursPerDay: bundlePushConfig.timeHours,
            daysRequired: 5,
            progressLabel: 'Optimize the evergreen funnel'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 3,
      maxActive: 5,
      metadata: {
        requirements: { hours: surveySprintConfig.timeHours },
        payout: { amount: surveySprintConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: surveySprintConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Complete the survey dash'
      },
      variants: [
        {
          id: 'survey-burst',
          label: 'Coffee Break Survey',
          description: 'Grab a quick stipend for a single micro feedback burst.',
          copies: 3,
          durationDays: 0,
          metadata: {
            payoutAmount: surveySprintConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: surveySprintConfig.timeHours },
            hoursPerDay: surveySprintConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Complete the coffee break survey'
          }
        },
        {
          id: 'survey-panel',
          label: 'Panel Follow-Up',
          description: 'Call past respondents for layered follow-up insights over two evenings.',
          copies: 2,
          durationDays: 1,
          metadata: {
            payoutAmount: 3,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 1 },
            hoursPerDay: 0.5,
            daysRequired: 2,
            progressLabel: 'Handle the panel follow-up'
          }
        },
        {
          id: 'survey-report',
          label: 'Insights Report Sprint',
          description: 'Compile responses into a polished insights deck for premium subscribers.',
          availableAfterDays: 1,
          durationDays: 2,
          metadata: {
            payoutAmount: 5,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 2.25 },
            hoursPerDay: 0.75,
            daysRequired: 3,
            progressLabel: 'Compile the survey report'
          }
        }
      ]
    },
    metrics: {
      time: { label: '📝 Survey dash time', category: 'hustle' },
      payout: { label: '🪙 Survey dash payout', category: 'hustle' }
    },
    skills: surveySprintConfig.skills,
    actionLabel: 'Start Survey'
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
    market: {
      slotsPerRoll: 1,
      maxActive: 2,
      metadata: {
        requirements: { hours: eventPhotoGigConfig.timeHours },
        payout: { amount: eventPhotoGigConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: eventPhotoGigConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Shoot the event gallery'
      },
      variants: [
        {
          id: 'photo-pop',
          label: 'Pop-Up Shoot',
          description: 'Capture a lively pop-up showcase with a single-day gallery sprint.',
          durationDays: 0,
          metadata: {
            payoutAmount: eventPhotoGigConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: eventPhotoGigConfig.timeHours },
            hoursPerDay: eventPhotoGigConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Deliver the pop-up gallery'
          }
        },
        {
          id: 'photo-weekender',
          label: 'Weekend Retainer',
          description: 'Cover a two-day festival run with daily highlight reels and VIP portraits.',
          durationDays: 2,
          metadata: {
            payoutAmount: 120,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 9 },
            hoursPerDay: 3,
            daysRequired: 3,
            progressLabel: 'Cover the weekend retainer'
          }
        },
        {
          id: 'photo-tour',
          label: 'Tour Documentary',
          description: 'Shadow a headliner for a full tour stop, from rehearsals to encore edits.',
          availableAfterDays: 1,
          durationDays: 4,
          metadata: {
            payoutAmount: 180,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 15 },
            hoursPerDay: 3,
            daysRequired: 5,
            progressLabel: 'Produce the tour documentary set'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 4,
      metadata: {
        requirements: { hours: popUpWorkshopConfig.timeHours },
        payout: { amount: popUpWorkshopConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: popUpWorkshopConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Teach the workshop curriculum'
      },
      variants: [
        {
          id: 'workshop-evening',
          label: 'Evening Intensive',
          description: 'Host a single-evening crash course with a lively Q&A finale.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: popUpWorkshopConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: popUpWorkshopConfig.timeHours },
            hoursPerDay: popUpWorkshopConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Run the evening intensive'
          }
        },
        {
          id: 'workshop-weekend',
          label: 'Weekend Cohort',
          description: 'Stretch the curriculum into a cozy two-day cohort with templates and recaps.',
          durationDays: 1,
          metadata: {
            payoutAmount: 60,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 5 },
            hoursPerDay: popUpWorkshopConfig.timeHours,
            daysRequired: 2,
            progressLabel: 'Guide the weekend workshop'
          }
        },
        {
          id: 'workshop-coaching',
          label: 'Mentor Track',
          description: 'Pair teaching with asynchronous feedback and office hours across the week.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 95,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 8 },
            hoursPerDay: 2,
            daysRequired: 4,
            progressLabel: 'Mentor the workshop cohort'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 4,
      metadata: {
        requirements: { hours: vlogEditRushConfig.timeHours },
        payout: { amount: vlogEditRushConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: vlogEditRushConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Edit the partner episode'
      },
      variants: [
        {
          id: 'vlog-rush-cut',
          label: 'Rush Cut',
          description: 'Slice b-roll, color, and caption a single episode against a tight deadline.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: vlogEditRushConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: vlogEditRushConfig.timeHours },
            hoursPerDay: vlogEditRushConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Deliver the rush cut'
          }
        },
        {
          id: 'vlog-batch',
          label: 'Batch Edit Package',
          description: 'Turn around two episodes with shared motion graphics and reusable transitions.',
          durationDays: 1,
          metadata: {
            payoutAmount: 40,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 3 },
            hoursPerDay: vlogEditRushConfig.timeHours,
            daysRequired: 2,
            progressLabel: 'Deliver the batch edit package'
          }
        },
        {
          id: 'vlog-season',
          label: 'Season Launch Sprint',
          description: 'Assemble opener graphics, teaser cuts, and QA for an entire mini-season.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 70,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 7 },
            hoursPerDay: 1.75,
            daysRequired: 4,
            progressLabel: 'Assemble the season launch sprint'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 4,
      metadata: {
        requirements: { hours: dropshipPackPartyConfig.timeHours },
        payout: { amount: dropshipPackPartyConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: dropshipPackPartyConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Pack the surprise boxes'
      },
      variants: [
        {
          id: 'dropship-flash-pack',
          label: 'Flash Pack Party',
          description: 'Bundle overnight orders with handwritten notes and confetti slips.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: dropshipPackPartyConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: dropshipPackPartyConfig.timeHours },
            hoursPerDay: dropshipPackPartyConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Handle the flash pack party'
          }
        },
        {
          id: 'dropship-weekender',
          label: 'Weekend Fulfillment Surge',
          description: 'Keep the warehouse humming through a two-day influencer spotlight.',
          durationDays: 1,
          metadata: {
            payoutAmount: 50,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 5 },
            hoursPerDay: 2.5,
            daysRequired: 2,
            progressLabel: 'Handle the weekend surge'
          }
        },
        {
          id: 'dropship-subscription',
          label: 'Subscription Box Assembly',
          description: 'Assemble a full month of subscription boxes with premium inserts and QA.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 90,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 10 },
            hoursPerDay: 2.5,
            daysRequired: 4,
            progressLabel: 'Bundle the subscription shipment'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 2,
      maxActive: 3,
      metadata: {
        requirements: { hours: saasBugSquashConfig.timeHours },
        payout: { amount: saasBugSquashConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: saasBugSquashConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Deploy the emergency fix'
      },
      variants: [
        {
          id: 'saas-hotfix',
          label: 'Hotfix Call',
          description: 'Trace crashes and patch the production build before support tickets pile up.',
          copies: 2,
          durationDays: 0,
          metadata: {
            payoutAmount: saasBugSquashConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: saasBugSquashConfig.timeHours },
            hoursPerDay: saasBugSquashConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Ship the emergency hotfix'
          }
        },
        {
          id: 'saas-hardening',
          label: 'Stability Hardening',
          description: 'Audit the service, expand tests, and close regression gaps over two days.',
          durationDays: 1,
          metadata: {
            payoutAmount: 55,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 2.5 },
            hoursPerDay: 1.25,
            daysRequired: 2,
            progressLabel: 'Harden the service for stability'
          }
        },
        {
          id: 'saas-sprint',
          label: 'Reliability Sprint',
          description: 'Lead a week-long reliability sprint with telemetry hooks and rollout plans.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 90,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 6 },
            hoursPerDay: 1.5,
            daysRequired: 4,
            progressLabel: 'Lead the reliability sprint'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 1,
      maxActive: 2,
      metadata: {
        requirements: { hours: audiobookNarrationConfig.timeHours },
        payout: { amount: audiobookNarrationConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: audiobookNarrationConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Narrate the featured chapter'
      },
      variants: [
        {
          id: 'audiobook-sample',
          label: 'Sample Chapter Session',
          description: 'Record a standout sample chapter with layered ambience and polish.',
          durationDays: 0,
          metadata: {
            payoutAmount: audiobookNarrationConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: audiobookNarrationConfig.timeHours },
            hoursPerDay: audiobookNarrationConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Cut the sample session'
          }
        },
        {
          id: 'audiobook-volume',
          label: 'Featured Volume Marathon',
          description: 'Deliver two feature chapters with bonus pickups and breath edits.',
          durationDays: 1,
          metadata: {
            payoutAmount: 70,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 5 },
            hoursPerDay: 2.5,
            daysRequired: 2,
            progressLabel: 'Record the featured volume'
          }
        },
        {
          id: 'audiobook-series',
          label: 'Series Finale Production',
          description: 'Narrate the season finale arc with retakes, engineering, and QC notes.',
          availableAfterDays: 1,
          durationDays: 4,
          metadata: {
            payoutAmount: 120,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 12.5 },
            hoursPerDay: 2.5,
            daysRequired: 5,
            progressLabel: 'Deliver the full series finale'
          }
        }
      ]
    },
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
    market: {
      slotsPerRoll: 3,
      maxActive: 5,
      metadata: {
        requirements: { hours: streetPromoSprintConfig.timeHours },
        payout: { amount: streetPromoSprintConfig.payout, schedule: 'onCompletion' },
        hoursPerDay: streetPromoSprintConfig.timeHours,
        daysRequired: 1,
        progressLabel: 'Hit the street team route'
      },
      variants: [
        {
          id: 'street-lunch-rush',
          label: 'Lunch Rush Pop-Up',
          description: 'Drop QR stickers at the lunch market and hype a limited-time drop.',
          copies: 3,
          durationDays: 0,
          metadata: {
            payoutAmount: streetPromoSprintConfig.payout,
            payoutSchedule: 'onCompletion',
            requirements: { hours: streetPromoSprintConfig.timeHours },
            hoursPerDay: streetPromoSprintConfig.timeHours,
            daysRequired: 1,
            progressLabel: 'Cover the lunch rush route'
          }
        },
        {
          id: 'street-market',
          label: 'Night Market Takeover',
          description: 'Coordinate volunteers and signage to dominate the evening night market.',
          copies: 2,
          durationDays: 1,
          metadata: {
            payoutAmount: 32,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 2 },
            hoursPerDay: 1,
            daysRequired: 2,
            progressLabel: 'Run the night market push'
          }
        },
        {
          id: 'street-festival',
          label: 'Festival Street Team',
          description: 'Lead the festival street team with scheduled hype cycles and sponsor shout-outs.',
          availableAfterDays: 1,
          durationDays: 3,
          metadata: {
            payoutAmount: 60,
            payoutSchedule: 'onCompletion',
            requirements: { hours: 5 },
            hoursPerDay: 1.25,
            daysRequired: 4,
            progressLabel: 'Lead the festival street team'
          }
        }
      ]
    },
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
