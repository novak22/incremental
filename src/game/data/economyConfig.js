import normalizedEconomy from '../../../docs/normalized_economy.json' with { type: 'json' };

const MINUTES_PER_HOUR = 60;

const toHours = minutes => minutes / MINUTES_PER_HOUR;

const toNumber = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const mapQualityCurve = curve =>
  curve.map(entry => ({
    level: entry.level,
    income: {
      min: entry.income_min,
      max: entry.income_max
    },
    requirements: entry.requirements || {}
  }));

const createAssetConfig = key => {
  const asset = normalizedEconomy.assets[key];
  const schedule = asset.schedule || {};

  return {
    setup: {
      days: schedule.setup_days,
      hoursPerDay: toHours(schedule.setup_minutes_per_day),
      cost: asset.setup_cost
    },
    maintenance: {
      hours: toHours(asset.maintenance_time),
      cost: asset.maintenance_cost
    },
    income: {
      base: asset.base_income,
      variance: asset.variance
    },
    requirements: asset.requirements || {},
    qualityLevels: mapQualityCurve(asset.quality_curve || [])
  };
};

const createHustleConfig = key => {
  const hustle = normalizedEconomy.hustles[key];
  return {
    timeHours: toHours(hustle.setup_time),
    payout: hustle.base_income,
    cost: hustle.setup_cost,
    dailyLimit: hustle.daily_limit
  };
};

const createUpgradeConfig = key => {
  const upgrade = normalizedEconomy.upgrades[key];
  return {
    cost: upgrade.setup_cost,
    requires: upgrade.requirements || []
  };
};

const createAssistantUpgradeConfig = () => {
  const assistant = normalizedEconomy.upgrades.assistant || {};
  const base = createUpgradeConfig('assistant');
  const bonusMinutes = Math.max(0, toNumber(assistant.bonus_minutes_per_day) ?? 0);
  const hoursPerAssistant = bonusMinutes > 0 ? toHours(bonusMinutes) : 0;
  const dailyWage = toNumber(assistant.daily_wage);
  const hourlyWage = toNumber(assistant.hourly_wage);
  const resolvedHourlyRate =
    hourlyWage ?? (hoursPerAssistant > 0 && dailyWage !== undefined ? dailyWage / hoursPerAssistant : 0);
  const resolvedDailyWage =
    dailyWage ?? (resolvedHourlyRate !== undefined ? resolvedHourlyRate * hoursPerAssistant : 0);
  const hiringCost = Math.max(0, toNumber(assistant.hiring_cost) ?? base.cost ?? 0);
  const maxAssistants = Math.max(0, toNumber(assistant.max_count ?? assistant.max_assistants) ?? 0);

  return {
    ...base,
    hiringCost,
    bonusMinutesPerAssistant: bonusMinutes,
    hoursPerAssistant,
    hourlyRate: resolvedHourlyRate ?? 0,
    dailyWage: resolvedDailyWage ?? 0,
    maxAssistants
  };
};

export const assistantUpgrade = createAssistantUpgradeConfig();

const createTrackConfig = key => {
  const track = normalizedEconomy.tracks[key];
  const schedule = track.schedule || {};
  return {
    schedule: {
      days: schedule.setup_days ?? schedule.days,
      minutesPerDay: schedule.setup_minutes_per_day ?? schedule.minutes_per_day
    },
    rewards: track.rewards || {}
  };
};

export const assets = {
  // Spec: docs/normalized_economy.json → assets.blog
  blog: createAssetConfig('blog'),
  // Spec: docs/normalized_economy.json → assets.ebook
  ebook: createAssetConfig('ebook'),
  // Spec: docs/normalized_economy.json → assets.vlog
  vlog: createAssetConfig('vlog'),
  // Spec: docs/normalized_economy.json → assets.stockPhotos
  stockPhotos: createAssetConfig('stockPhotos'),
  // Spec: docs/normalized_economy.json → assets.dropshipping
  dropshipping: createAssetConfig('dropshipping'),
  // Spec: docs/normalized_economy.json → assets.saas
  saas: createAssetConfig('saas')
};

export const hustles = {
  // Spec: docs/normalized_economy.json → hustles.freelance
  freelance: createHustleConfig('freelance'),
  // Spec: docs/normalized_economy.json → hustles.audienceCall
  audienceCall: createHustleConfig('audienceCall'),
  // Spec: docs/normalized_economy.json → hustles.bundlePush
  bundlePush: createHustleConfig('bundlePush'),
  // Spec: docs/normalized_economy.json → hustles.surveySprint
  surveySprint: createHustleConfig('surveySprint'),
  // Spec: docs/normalized_economy.json → hustles.eventPhotoGig
  eventPhotoGig: createHustleConfig('eventPhotoGig'),
  // Spec: docs/normalized_economy.json → hustles.popUpWorkshop
  popUpWorkshop: createHustleConfig('popUpWorkshop'),
  // Spec: docs/normalized_economy.json → hustles.vlogEditRush
  vlogEditRush: createHustleConfig('vlogEditRush'),
  // Spec: docs/normalized_economy.json → hustles.dropshipPackParty
  dropshipPackParty: createHustleConfig('dropshipPackParty'),
  // Spec: docs/normalized_economy.json → hustles.saasBugSquash
  saasBugSquash: createHustleConfig('saasBugSquash'),
  // Spec: docs/normalized_economy.json → hustles.audiobookNarration
  audiobookNarration: createHustleConfig('audiobookNarration'),
  // Spec: docs/normalized_economy.json → hustles.streetPromoSprint
  streetPromoSprint: createHustleConfig('streetPromoSprint')
};

export const upgrades = {
  // Spec: docs/normalized_economy.json → upgrades.coffee
  coffee: createUpgradeConfig('coffee'),
  // Spec: docs/normalized_economy.json → upgrades.studio
  studio: createUpgradeConfig('studio'),
  // Spec: docs/normalized_economy.json → upgrades.studioExpansion
  studioExpansion: createUpgradeConfig('studioExpansion'),
  // Spec: docs/normalized_economy.json → upgrades.assistant
  assistant: assistantUpgrade,
  // Spec: docs/normalized_economy.json → upgrades.serverRack
  serverRack: createUpgradeConfig('serverRack'),
  // Spec: docs/normalized_economy.json → upgrades.fulfillmentAutomation
  fulfillmentAutomation: createUpgradeConfig('fulfillmentAutomation'),
  // Spec: docs/normalized_economy.json → upgrades.serverCluster
  serverCluster: createUpgradeConfig('serverCluster'),
  // Spec: docs/normalized_economy.json → upgrades.globalSupplyMesh
  globalSupplyMesh: createUpgradeConfig('globalSupplyMesh'),
  // Spec: docs/normalized_economy.json → upgrades.serverEdge
  serverEdge: createUpgradeConfig('serverEdge'),
  // Spec: docs/normalized_economy.json → upgrades.whiteLabelAlliance
  whiteLabelAlliance: createUpgradeConfig('whiteLabelAlliance'),
  // Spec: docs/normalized_economy.json → upgrades.creatorPhone
  creatorPhone: createUpgradeConfig('creatorPhone'),
  // Spec: docs/normalized_economy.json → upgrades.creatorPhonePro
  creatorPhonePro: createUpgradeConfig('creatorPhonePro'),
  // Spec: docs/normalized_economy.json → upgrades.creatorPhoneUltra
  creatorPhoneUltra: createUpgradeConfig('creatorPhoneUltra'),
  // Spec: docs/normalized_economy.json → upgrades.studioLaptop
  studioLaptop: createUpgradeConfig('studioLaptop'),
  // Spec: docs/normalized_economy.json → upgrades.editingWorkstation
  editingWorkstation: createUpgradeConfig('editingWorkstation'),
  // Spec: docs/normalized_economy.json → upgrades.quantumRig
  quantumRig: createUpgradeConfig('quantumRig'),
  // Spec: docs/normalized_economy.json → upgrades.monitorHub
  monitorHub: createUpgradeConfig('monitorHub'),
  // Spec: docs/normalized_economy.json → upgrades.dualMonitorArray
  dualMonitorArray: createUpgradeConfig('dualMonitorArray'),
  // Spec: docs/normalized_economy.json → upgrades.colorGradingDisplay
  colorGradingDisplay: createUpgradeConfig('colorGradingDisplay'),
  // Spec: docs/normalized_economy.json → upgrades.camera
  camera: createUpgradeConfig('camera'),
  // Spec: docs/normalized_economy.json → upgrades.cameraPro
  cameraPro: createUpgradeConfig('cameraPro'),
  // Spec: docs/normalized_economy.json → upgrades.audioSuite
  audioSuite: createUpgradeConfig('audioSuite'),
  // Spec: docs/normalized_economy.json → upgrades.ergonomicRefit
  ergonomicRefit: createUpgradeConfig('ergonomicRefit'),
  // Spec: docs/normalized_economy.json → upgrades.fiberInternet
  fiberInternet: createUpgradeConfig('fiberInternet'),
  // Spec: docs/normalized_economy.json → upgrades.backupPowerArray
  backupPowerArray: createUpgradeConfig('backupPowerArray'),
  // Spec: docs/normalized_economy.json → upgrades.scratchDriveArray
  scratchDriveArray: createUpgradeConfig('scratchDriveArray'),
  // Spec: docs/normalized_economy.json → upgrades.editorialPipeline
  editorialPipeline: createUpgradeConfig('editorialPipeline'),
  // Spec: docs/normalized_economy.json → upgrades.syndicationSuite
  syndicationSuite: createUpgradeConfig('syndicationSuite'),
  // Spec: docs/normalized_economy.json → upgrades.immersiveStoryWorlds
  immersiveStoryWorlds: createUpgradeConfig('immersiveStoryWorlds'),
  // Spec: docs/normalized_economy.json → upgrades.course
  course: createUpgradeConfig('course')
};

export const tracks = {
  // Spec: docs/normalized_economy.json → tracks.storycraftJumpstart
  storycraftJumpstart: createTrackConfig('storycraftJumpstart'),
  // Spec: docs/normalized_economy.json → tracks.vlogStudioJumpstart
  vlogStudioJumpstart: createTrackConfig('vlogStudioJumpstart'),
  // Spec: docs/normalized_economy.json → tracks.digitalShelfPrimer
  digitalShelfPrimer: createTrackConfig('digitalShelfPrimer'),
  // Spec: docs/normalized_economy.json → tracks.commerceLaunchPrimer
  commerceLaunchPrimer: createTrackConfig('commerceLaunchPrimer'),
  // Spec: docs/normalized_economy.json → tracks.microSaasJumpstart
  microSaasJumpstart: createTrackConfig('microSaasJumpstart'),
  // Spec: docs/normalized_economy.json → tracks.outlineMastery
  outlineMastery: createTrackConfig('outlineMastery'),
  // Spec: docs/normalized_economy.json → tracks.photoLibrary
  photoLibrary: createTrackConfig('photoLibrary'),
  // Spec: docs/normalized_economy.json → tracks.ecomPlaybook
  ecomPlaybook: createTrackConfig('ecomPlaybook'),
  // Spec: docs/normalized_economy.json → tracks.automationCourse
  automationCourse: createTrackConfig('automationCourse'),
  // Spec: docs/normalized_economy.json → tracks.brandVoiceLab
  brandVoiceLab: createTrackConfig('brandVoiceLab'),
  // Spec: docs/normalized_economy.json → tracks.guerillaBuzzWorkshop
  guerillaBuzzWorkshop: createTrackConfig('guerillaBuzzWorkshop'),
  // Spec: docs/normalized_economy.json → tracks.curriculumDesignStudio
  curriculumDesignStudio: createTrackConfig('curriculumDesignStudio'),
  // Spec: docs/normalized_economy.json → tracks.postProductionPipelineLab
  postProductionPipelineLab: createTrackConfig('postProductionPipelineLab'),
  // Spec: docs/normalized_economy.json → tracks.fulfillmentOpsMasterclass
  fulfillmentOpsMasterclass: createTrackConfig('fulfillmentOpsMasterclass'),
  // Spec: docs/normalized_economy.json → tracks.customerRetentionClinic
  customerRetentionClinic: createTrackConfig('customerRetentionClinic'),
  // Spec: docs/normalized_economy.json → tracks.narrationPerformanceWorkshop
  narrationPerformanceWorkshop: createTrackConfig('narrationPerformanceWorkshop'),
  // Spec: docs/normalized_economy.json → tracks.galleryLicensingSummit
  galleryLicensingSummit: createTrackConfig('galleryLicensingSummit'),
  // Spec: docs/normalized_economy.json → tracks.syndicationResidency
  syndicationResidency: createTrackConfig('syndicationResidency')
};

