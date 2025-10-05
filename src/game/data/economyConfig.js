import normalizedEconomy from '../../../docs/normalized_economy.json' with { type: 'json' };

const MINUTES_PER_HOUR = 60;

const toHours = minutes => minutes / MINUTES_PER_HOUR;

const mapQualityCurve = curve =>
  curve.map(entry => ({
    level: entry.level,
    income: {
      min: entry.income_min,
      max: entry.income_max
    },
    requirements: entry.requirements || {}
  }));

const parseModifierTarget = target => {
  if (!target || typeof target !== 'string') {
    return { category: null, id: null, stat: null };
  }

  const [category = null, descriptor = ''] = target.split(':');
  const [id = null, stat = null] = descriptor.split('.');

  return { category, id, stat };
};

const parseModifierAmount = modifier => {
  if (!modifier) return 0;
  if (typeof modifier.amount === 'number') {
    return modifier.amount;
  }

  const formula = modifier.formula || '';
  if (modifier.type === 'multiplier') {
    const multiplierMatch = formula.match(/\(1\s*\+\s*([0-9.]+)\)/);
    if (multiplierMatch) {
      const value = Number(multiplierMatch[1]);
      return Number.isFinite(value) ? value : 0;
    }
    const directMatch = formula.match(/\*\s*([0-9.]+)/);
    if (directMatch) {
      const value = Number(directMatch[1]);
      return Number.isFinite(value) ? value - 1 : 0;
    }
  }

  if (modifier.type === 'flat') {
    const flatMatch = formula.match(/\+\s*([0-9.]+)/);
    if (flatMatch) {
      const value = Number(flatMatch[1]);
      return Number.isFinite(value) ? value : 0;
    }
  }

  return 0;
};

const mapInstantBoost = modifier => {
  const target = parseModifierTarget(modifier.target);
  const amount = parseModifierAmount(modifier);
  const base = {
    type: modifier.type,
    amount,
    notes: modifier.notes || null,
    target: modifier.target || null,
    formula: modifier.formula || null
  };

  if (target.category === 'asset') {
    const asset = normalizedEconomy.assets?.[target.id] || {};
    return {
      ...base,
      assetId: target.id,
      assetName: asset.name || target.id
    };
  }

  if (target.category === 'hustle') {
    const hustle = normalizedEconomy.hustles?.[target.id] || {};
    return {
      ...base,
      hustleId: target.id,
      hustleName: hustle.name || target.id
    };
  }

  return base;
};

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

const createTrackConfig = key => {
  const track = normalizedEconomy.tracks[key];
  const schedule = track.schedule || {};
  const days = schedule.setup_days ?? schedule.days ?? 0;
  const minutesPerDay = schedule.setup_minutes_per_day ?? schedule.minutes_per_day ?? 0;
  const instantBoosts = (normalizedEconomy.modifiers || [])
    .filter(modifier => modifier.source === key)
    .map(mapInstantBoost);

  return {
    id: key,
    name: track.name || key,
    schedule: {
      days,
      minutesPerDay,
      hoursPerDay: toHours(minutesPerDay)
    },
    setupCost: track.setup_cost ?? 0,
    rewards: track.rewards || {},
    instantBoosts
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
  assistant: createUpgradeConfig('assistant'),
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

