import { structuredClone } from '../../core/helpers.js';

const DEFAULT_SEATS = 1;

const toNumber = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toPositive = (value, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const fallbackNumeric = Number(fallback);
    return Number.isFinite(fallbackNumeric) && fallbackNumeric > 0 ? Math.floor(fallbackNumeric) : 1;
  }
  return Math.floor(numeric);
};

const buildBaseMetadata = ({ hoursRequired, payoutAmount, progressLabel, hoursPerDay, daysRequired }) => {
  const metadata = {
    requirements: { hours: hoursRequired },
    payout: { amount: payoutAmount, schedule: 'onCompletion' },
    hoursPerDay,
    daysRequired,
    progressLabel
  };

  if (hoursPerDay == null) {
    delete metadata.hoursPerDay;
  }
  if (daysRequired == null) {
    delete metadata.daysRequired;
  }
  if (!progressLabel) {
    delete metadata.progressLabel;
  }

  return metadata;
};

const buildVariant = ({
  id,
  label,
  description,
  copies = 1,
  durationDays = 0,
  availableAfterDays = 0,
  payoutAmount,
  progressLabel,
  hoursRequired,
  hoursPerDay,
  daysRequired,
  progress,
  metadata = {},
  seats
}) => {
  const mergedMetadata = {
    ...metadata,
    payoutAmount,
    payoutSchedule: metadata.payoutSchedule || 'onCompletion',
    progressLabel,
    requirements: { hours: hoursRequired },
    hoursPerDay,
    daysRequired
  };

  if (hoursPerDay == null) {
    delete mergedMetadata.hoursPerDay;
  }
  if (daysRequired == null) {
    delete mergedMetadata.daysRequired;
  }
  if (!progressLabel) {
    delete mergedMetadata.progressLabel;
  }

  const variant = {
    id,
    label,
    description,
    copies,
    durationDays,
    availableAfterDays,
    metadata: mergedMetadata
  };

  if (progress) {
    variant.metadata.progress = progress;
  }

  if (seats != null) {
    variant.seats = toPositive(seats, DEFAULT_SEATS);
  }

  return variant;
};

function buildFreelanceMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'writing',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 4,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Write the commissioned piece',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'freelance-rush',
        label: 'Same-Day Draft',
        description: 'Turn a trending request into a polished rush article before the news cycle flips.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Draft the rush article'
      }),
      buildVariant({
        id: 'freelance-series',
        label: 'Three-Part Mini Series',
        description: 'Outline, draft, and polish a three-installment story arc for a premium client.',
        durationDays: 2,
        payoutAmount: Math.round(payout * 2.5),
        hoursRequired: hours * 3,
        hoursPerDay: hours,
        daysRequired: 3,
        progressLabel: 'Outline and polish the mini-series'
      }),
      buildVariant({
        id: 'freelance-retainer',
        label: 'Weekly Retainer Columns',
        description: 'Keep a subscriber base buzzing with a full week of evergreen columns.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 80,
        hoursRequired: hours * 4,
        hoursPerDay: hours,
        daysRequired: 4,
        progressLabel: 'Deliver the retainer lineup'
      })
    ]
  };
}

function buildAudienceCallMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'community',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 3,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Host the Q&A stream',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'audience-flash',
        label: 'Flash AMA',
        description: 'Stage a quick Q&A for superfans during the lunch break rush.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Host the flash AMA'
      }),
      buildVariant({
        id: 'audience-series',
        label: 'Mini Workshop Series',
        description: 'Break a dense topic into two cozy livestreams with downloadable extras.',
        durationDays: 1,
        payoutAmount: 24,
        hoursRequired: hours * 2,
        hoursPerDay: hours,
        daysRequired: 2,
        progressLabel: 'Run the mini workshop series'
      }),
      buildVariant({
        id: 'audience-cohort',
        label: 'Community Coaching Cohort',
        description: 'Coach a private cohort through deep-dive Q&A sessions across the week.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 40,
        hoursRequired: hours * 4,
        hoursPerDay: hours * 1.5,
        daysRequired: 3,
        progressLabel: 'Coach the cohort Q&A'
      })
    ]
  };
}

function buildBundlePushMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'marketing',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 3,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Bundle the featured offer',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'bundle-flash',
        label: 'Flash Sale Blast',
        description: 'Pair blog hits with a one-day bonus bundle and shout it across every channel.',
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Run the flash sale blast'
      }),
      buildVariant({
        id: 'bundle-roadshow',
        label: 'Cross-Promo Roadshow',
        description: 'Spin up a three-day partner push with curated bundles for every audience segment.',
        durationDays: 2,
        payoutAmount: 72,
        hoursRequired: hours * 2.4,
        hoursPerDay: 2,
        daysRequired: 3,
        progressLabel: 'Host the cross-promo roadshow'
      }),
      buildVariant({
        id: 'bundle-evergreen',
        label: 'Evergreen Funnel Revamp',
        description: 'Refine the evergreen funnel, swap testimonials, and refresh every automated upsell.',
        availableAfterDays: 1,
        durationDays: 4,
        payoutAmount: 120,
        hoursRequired: hours * 5,
        hoursPerDay: hours,
        daysRequired: 5,
        progressLabel: 'Optimize the evergreen funnel'
      })
    ]
  };
}

function buildSurveySprintMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'research',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 3,
    maxActive: 5,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Complete the survey dash',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'survey-burst',
        label: 'Coffee Break Survey',
        description: 'Grab a quick stipend for a single micro feedback burst.',
        copies: 3,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Complete the coffee break survey'
      }),
      buildVariant({
        id: 'survey-panel',
        label: 'Panel Follow-Up',
        description: 'Call past respondents for layered follow-up insights over two evenings.',
        copies: 2,
        durationDays: 1,
        payoutAmount: 3,
        hoursRequired: 1,
        hoursPerDay: 0.5,
        daysRequired: 2,
        progressLabel: 'Handle the panel follow-up'
      }),
      buildVariant({
        id: 'survey-report',
        label: 'Insights Report Sprint',
        description: 'Compile responses into a polished insights deck for premium subscribers.',
        availableAfterDays: 1,
        durationDays: 2,
        payoutAmount: 5,
        hoursRequired: 2.25,
        hoursPerDay: 0.75,
        daysRequired: 3,
        progressLabel: 'Compile the survey report'
      })
    ]
  };
}

function buildEventPhotoMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'events',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 1,
    maxActive: 2,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Shoot the event gallery',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'photo-pop',
        label: 'Pop-Up Shoot',
        description: 'Capture a lively pop-up showcase with a single-day gallery sprint.',
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Deliver the pop-up gallery'
      }),
      buildVariant({
        id: 'photo-weekender',
        label: 'Weekend Retainer',
        description: 'Cover a two-day festival run with daily highlight reels and VIP portraits.',
        durationDays: 2,
        payoutAmount: 120,
        hoursRequired: 9,
        hoursPerDay: 3,
        daysRequired: 3,
        progressLabel: 'Cover the weekend retainer'
      }),
      buildVariant({
        id: 'photo-tour',
        label: 'Tour Documentary',
        description: 'Shadow a headliner for a full tour stop, from rehearsals to encore edits.',
        availableAfterDays: 1,
        durationDays: 4,
        payoutAmount: 180,
        hoursRequired: 15,
        hoursPerDay: 3,
        daysRequired: 5,
        progressLabel: 'Produce the tour documentary set'
      })
    ]
  };
}

function buildPopUpWorkshopMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'education',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 4,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Teach the workshop curriculum',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'workshop-evening',
        label: 'Evening Intensive',
        description: 'Host a single-evening crash course with a lively Q&A finale.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Run the evening intensive'
      }),
      buildVariant({
        id: 'workshop-weekend',
        label: 'Weekend Cohort',
        description: 'Stretch the curriculum into a cozy two-day cohort with templates and recaps.',
        durationDays: 1,
        payoutAmount: 60,
        hoursRequired: 5,
        hoursPerDay: hours,
        daysRequired: 2,
        progressLabel: 'Guide the weekend workshop'
      }),
      buildVariant({
        id: 'workshop-coaching',
        label: 'Mentor Track',
        description: 'Pair teaching with asynchronous feedback and office hours across the week.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 95,
        hoursRequired: 8,
        hoursPerDay: 2,
        daysRequired: 4,
        progressLabel: 'Mentor the workshop cohort'
      })
    ]
  };
}

function buildVlogEditRushMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'video',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 4,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Edit the partner episode',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'vlog-rush-cut',
        label: 'Rush Cut',
        description: 'Slice b-roll, color, and caption a single episode against a tight deadline.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Deliver the rush cut'
      }),
      buildVariant({
        id: 'vlog-batch',
        label: 'Batch Edit Package',
        description: 'Turn around two episodes with shared motion graphics and reusable transitions.',
        durationDays: 1,
        payoutAmount: 40,
        hoursRequired: 3,
        hoursPerDay: hours,
        daysRequired: 2,
        progressLabel: 'Deliver the batch edit package'
      }),
      buildVariant({
        id: 'vlog-season',
        label: 'Season Launch Sprint',
        description: 'Assemble opener graphics, teaser cuts, and QA for an entire mini-season.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 70,
        hoursRequired: 7,
        hoursPerDay: 1.75,
        daysRequired: 4,
        progressLabel: 'Assemble the season launch sprint'
      })
    ]
  };
}

function buildDropshipPackPartyMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'logistics',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 4,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Pack the surprise boxes',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'dropship-flash-pack',
        label: 'Flash Pack Party',
        description: 'Bundle overnight orders with handwritten notes and confetti slips.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Handle the flash pack party'
      }),
      buildVariant({
        id: 'dropship-weekender',
        label: 'Weekend Fulfillment Surge',
        description: 'Keep the warehouse humming through a two-day influencer spotlight.',
        durationDays: 1,
        payoutAmount: 50,
        hoursRequired: 5,
        hoursPerDay: 2.5,
        daysRequired: 2,
        progressLabel: 'Handle the weekend surge'
      }),
      buildVariant({
        id: 'dropship-subscription',
        label: 'Subscription Box Assembly',
        description: 'Assemble a full month of subscription boxes with premium inserts and QA.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 90,
        hoursRequired: 10,
        hoursPerDay: 2.5,
        daysRequired: 4,
        progressLabel: 'Bundle the subscription shipment'
      })
    ]
  };
}

function buildSaasBugSquashMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'software',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 2,
    maxActive: 3,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Deploy the emergency fix',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'saas-hotfix',
        label: 'Hotfix Call',
        description: 'Trace crashes and patch the production build before support tickets pile up.',
        copies: 2,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Ship the emergency hotfix'
      }),
      buildVariant({
        id: 'saas-hardening',
        label: 'Stability Hardening',
        description: 'Audit the service, expand tests, and close regression gaps over two days.',
        durationDays: 1,
        payoutAmount: 55,
        hoursRequired: 2.5,
        hoursPerDay: 1.25,
        daysRequired: 2,
        progressLabel: 'Harden the service for stability'
      }),
      buildVariant({
        id: 'saas-sprint',
        label: 'Reliability Sprint',
        description: 'Lead a week-long reliability sprint with telemetry hooks and rollout plans.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 90,
        hoursRequired: 6,
        hoursPerDay: 1.5,
        daysRequired: 4,
        progressLabel: 'Lead the reliability sprint'
      })
    ]
  };
}

function buildAudiobookNarrationMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'audio',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 1,
    maxActive: 2,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Narrate the featured chapter',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'audiobook-sample',
        label: 'Sample Chapter Session',
        description: 'Record a standout sample chapter with layered ambience and polish.',
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Cut the sample session'
      }),
      buildVariant({
        id: 'audiobook-volume',
        label: 'Featured Volume Marathon',
        description: 'Deliver two feature chapters with bonus pickups and breath edits.',
        durationDays: 1,
        payoutAmount: 70,
        hoursRequired: 5,
        hoursPerDay: 2.5,
        daysRequired: 2,
        progressLabel: 'Record the featured volume'
      }),
      buildVariant({
        id: 'audiobook-series',
        label: 'Series Finale Production',
        description: 'Narrate the season finale arc with retakes, engineering, and QC notes.',
        availableAfterDays: 1,
        durationDays: 4,
        payoutAmount: 120,
        hoursRequired: 12.5,
        hoursPerDay: 2.5,
        daysRequired: 5,
        progressLabel: 'Deliver the full series finale'
      })
    ]
  };
}

function buildStreetPromoSprintMarket(base = {}) {
  const hours = toNumber(base.timeHours);
  const payout = toNumber(base.payout);

  return {
    category: 'promotion',
    seats: DEFAULT_SEATS,
    slotsPerRoll: 3,
    maxActive: 5,
    metadata: buildBaseMetadata({
      hoursRequired: hours,
      payoutAmount: payout,
      progressLabel: 'Hit the street team route',
      hoursPerDay: hours,
      daysRequired: 1
    }),
    variants: [
      buildVariant({
        id: 'street-lunch-rush',
        label: 'Lunch Rush Pop-Up',
        description: 'Drop QR stickers at the lunch market and hype a limited-time drop.',
        copies: 3,
        payoutAmount: payout,
        hoursRequired: hours,
        hoursPerDay: hours,
        daysRequired: 1,
        progressLabel: 'Cover the lunch rush route'
      }),
      buildVariant({
        id: 'street-market',
        label: 'Night Market Takeover',
        description: 'Coordinate volunteers and signage to dominate the evening night market.',
        copies: 2,
        durationDays: 1,
        payoutAmount: 32,
        hoursRequired: 2,
        hoursPerDay: 1,
        daysRequired: 2,
        progressLabel: 'Run the night market push'
      }),
      buildVariant({
        id: 'street-festival',
        label: 'Festival Street Team',
        description: 'Lead the festival street team with scheduled hype cycles and sponsor shout-outs.',
        availableAfterDays: 1,
        durationDays: 3,
        payoutAmount: 60,
        hoursRequired: 5,
        hoursPerDay: 1.25,
        daysRequired: 4,
        progressLabel: 'Lead the festival street team'
      })
    ]
  };
}

const MARKET_BUILDERS = {
  freelance: buildFreelanceMarket,
  audienceCall: buildAudienceCallMarket,
  bundlePush: buildBundlePushMarket,
  surveySprint: buildSurveySprintMarket,
  eventPhotoGig: buildEventPhotoMarket,
  popUpWorkshop: buildPopUpWorkshopMarket,
  vlogEditRush: buildVlogEditRushMarket,
  dropshipPackParty: buildDropshipPackPartyMarket,
  saasBugSquash: buildSaasBugSquashMarket,
  audiobookNarration: buildAudiobookNarrationMarket,
  streetPromoSprint: buildStreetPromoSprintMarket
};

export function getHustleMarketConfig(key, baseConfig = {}) {
  const builder = MARKET_BUILDERS[key];
  if (!builder) {
    return null;
  }
  const config = builder(baseConfig || {});
  return config ? structuredClone(config) : null;
}

export function getAllHustleMarketConfigs(baseConfigs = {}) {
  const entries = Object.entries(MARKET_BUILDERS).map(([key, builder]) => {
    const base = baseConfigs[key] || {};
    const config = builder(base);
    return [key, config ? structuredClone(config) : null];
  });
  return Object.fromEntries(entries);
}

