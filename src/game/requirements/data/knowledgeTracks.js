import { tracks as trackConfig } from '../../data/economyConfig.js';

const TRACK_DESCRIPTIONS = {
  storycraftJumpstart:
    'Outline pillar posts for 3 days (4h/day) and polish headlines without paying tuition.',
  vlogStudioJumpstart:
    'Shadow a creator coach for 3 days (4h/day) to frame shots, light sets, and warm up edits. Tuition free.',
  digitalShelfPrimer:
    'Curate e-books and galleries for 3 days (4h/day) to master metadata, covers, and storefront polish — no tuition required.',
  commerceLaunchPrimer:
    'Shadow a fulfillment lead for 3 days (4h/day) to set up shipping flows and customer support scripts for free.',
  microSaasJumpstart:
    'Pair with senior engineers for 3 days (4h/day) to ship deploy scripts and uptime monitors with zero tuition.',
  outlineMastery:
    'Deep-dive into narrative scaffolding for 5 days (2h/day). Tuition due upfront.',
  photoLibrary:
    'Archive, tag, and light-edit your best work for 4 days (1.5h/day). Tuition due upfront.',
  ecomPlaybook:
    'Shadow a pro operator for 9 days (3h/day) to master funnels and fulfillment math.',
  automationCourse:
    'Pair-program with mentors for 15 days (6h/day) to architect a reliable micro-app.',
  brandVoiceLab:
    'Work with pitch coaches for 4 days (1h/day) to sharpen live Q&A charisma.',
  guerillaBuzzWorkshop:
    'Field-test hype hooks for 6 days (1.5h/day) with a crew of street marketers.',
  curriculumDesignStudio:
    'Prototype interactive lesson plans for 6 days (2.5h/day) with veteran educators.',
  postProductionPipelineLab:
    'Run edit bays for 10 days (4h/day) to master color, captions, and delivery workflows.',
  fulfillmentOpsMasterclass:
    'Shadow a logistics crew for 10 days (4h/day) to automate pick, pack, and ship perfection.',
  customerRetentionClinic:
    'Coach subscription success teams for 7 days (3h/day) to keep churn near zero.',
  narrationPerformanceWorkshop:
    'Spend 7 days (3h/day) with vocal coaches to perfect audiobook cadence.',
  galleryLicensingSummit:
    'Pitch curators for 8 days (4h/day) to secure premium gallery licensing deals.',
  syndicationResidency:
    'Curate partnerships for 9 days (4h/day) to syndicate your flagship content network.'
};

const buildInstantBoost = boost => {
  if (!boost) return null;
  const amount = Number(boost.amount) || 0;
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }

  const entry = {
    type: boost.type === 'flat' ? 'flat' : 'multiplier',
    amount
  };

  if (boost.assetId) {
    entry.assetId = boost.assetId;
    entry.assetName = boost.assetName || boost.assetId;
  }

  if (boost.hustleId) {
    entry.hustleId = boost.hustleId;
    entry.hustleName = boost.hustleName || boost.hustleId;
  }

  return entry;
};

const knowledgeTrackData = Object.fromEntries(
  Object.entries(trackConfig).map(([id, track]) => {
    const schedule = track?.schedule || {};
    const instantBoosts = Array.isArray(track?.instantBoosts)
      ? track.instantBoosts.map(buildInstantBoost).filter(Boolean)
      : [];

    return [
      id,
      {
        id,
        name: track?.name || id,
        description: TRACK_DESCRIPTIONS[id] || '',
        hoursPerDay: Number(schedule.hoursPerDay) || 0,
        days: Number(schedule.days) || 0,
        tuition: Number(track?.setupCost ?? 0) || 0,
        instantBoosts
      }
    ];
  })
);

export default knowledgeTrackData;
