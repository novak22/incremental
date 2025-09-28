const STORAGE_KEY = 'online-hustle-sim-v1';
const MAX_LOG_ENTRIES = 60;
const BLOG_CHUNK = 3;
const BLOG_INTERVAL_SECONDS = 10;
const COFFEE_LIMIT = 3;

const HUSTLES = [
  {
    id: 'freelance',
    name: 'Freelance Writing',
    tag: { label: 'Instant', type: 'instant' },
    description: 'Crank out a quick article for a client. Not Pulitzer material, but it pays.',
    details: [
      () => '⏳ Time: <strong>2h</strong>',
      () => '💵 Payout: <strong>$18</strong>'
    ],
    action: {
      label: 'Write Now',
      className: 'primary',
      disabled: () => state.timeLeft < 2,
      onClick: () => executeAction(() => {
        spendTime(2);
        addMoney(18, 'You hustled an article for $18. Not Pulitzer material, but it pays the bills!');
      }, { checkDay: true })
    }
  },
  {
    id: 'flips',
    name: 'eBay Flips',
    tag: { label: 'Delayed', type: 'delayed' },
    description: 'Hunt for deals, flip them online. Profit arrives fashionably late.',
    details: [
      () => '⏳ Time: <strong>4h</strong>',
      () => '💵 Cost: <strong>$20</strong>',
      () => '💰 Payout: <strong>$48 after 30s</strong>'
    ],
    defaultState: {
      pending: []
    },
    action: {
      label: 'Start Flip',
      className: 'primary',
      disabled: () => state.timeLeft < 4 || state.money < 20,
      onClick: () => executeAction(() => {
        spendTime(4);
        spendMoney(20);
        scheduleFlip();
        addLog('You listed a spicy eBay flip. In 30 seconds it should cha-ching for $48!', 'delayed');
      }, { checkDay: true })
    },
    extraContent: card => {
      const status = document.createElement('div');
      status.className = 'pending';
      status.textContent = 'No flips in progress.';
      card.appendChild(status);
      return { status };
    },
    update: (_state, ui) => {
      updateFlipStatus(ui.extra.status);
    },
    process: (now, offline) => processFlipPayouts(now, offline)
  }
];

const ASSETS = [
  {
    id: 'blog',
    name: 'Personal Blog',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Launch a blog that trickles income while you sip questionable coffee.',
    maintenanceTime: 1,
    dailyPayout: 45,
    defaultState: {
      instances: [],
      multiplier: 1,
      active: false,
      buffer: 0,
      multiplier: 1,
      fundedToday: false
    },
    details: [
      () => '⏳ Setup Time: <strong>3h</strong>',
      () => '💵 Setup Cost: <strong>$25</strong>',
      () => {
        const asset = getAssetState('blog');
        const perInstance = BLOG_CHUNK * asset.multiplier;
        const active = asset.instances.length;
        const total = perInstance * active;
        const totalLabel = active ? ` | Total: <strong>$${formatMoney(total)} / 10s</strong>` : '';
        return `💸 Income: <strong>$${formatMoney(perInstance)} / 10s</strong> per blog${totalLabel}`;
      }
        const income = BLOG_CHUNK * asset.multiplier;
        return `💸 Income: <strong>$${formatMoney(income)} / 10s</strong>`;
      },
      () => {
        const asset = getAssetState('blog');
        const status = asset.fundedToday ? 'Funded' : 'Unfunded';
        return `🛠 Maintenance: <strong>${formatHours(ASSET_MAP.get('blog').maintenanceTime)} / day</strong> (${status})`;
      },
      () => `📆 Daily Payout: <strong>$${formatMoney(ASSET_MAP.get('blog').dailyPayout)}</strong>`
    ],
    action: {
      label: () => {
        const count = getAssetState('blog').instances.length;
        return count ? 'Launch Another Blog' : 'Launch Blog';
      },
      className: 'primary',
      disabled: () => {
        return state.timeLeft < 3 || state.money < 25;
      },
      onClick: () => executeAction(() => {
        const asset = getAssetState('blog');
        spendTime(3);
        spendMoney(25);
        const newInstance = createAssetInstance();
        asset.instances.push(newInstance);
        const index = asset.instances.length;
        addLog(
          `You launched blog #${index}! Expect slow trickles of internet fame and $${formatMoney(BLOG_CHUNK)} every 10 seconds from each.`,
          'passive'
        );
        asset.active = true;
        asset.buffer = 0;
        asset.fundedToday = false;
        addLog('You launched your blog! Expect slow trickles of internet fame and $3 every 10 seconds.', 'passive');
      }, { checkDay: true })
    },
    passiveIncome: {
      interval: BLOG_INTERVAL_SECONDS,
      logType: 'passive',
      message: amount => `Your blog quietly earned $${formatMoney(amount)} while you scrolled memes.`,
      offlineMessage: total => `Your blog earned $${formatMoney(total)} while you were offline. Not too shabby!`
    },
    isActive: (_state, assetState) => assetState.instances.length > 0,
    getIncomeAmount: (_state, assetState, _instance) => BLOG_CHUNK * assetState.multiplier,
    extraContent: card => {
      const container = document.createElement('div');
      container.className = 'asset-instances';
      card.appendChild(container);
      return { container };
    },
    update: (_state, ui) => {
      if (!ui.extra?.container) return;
      renderBlogInstances(ui.extra.container);
    },
    isActive: (_state, assetState) => assetState.active && assetState.fundedToday,
    getIncomeAmount: (_state, assetState) => BLOG_CHUNK * assetState.multiplier
  },
  {
    id: 'vlog',
    name: 'Vlog Channel',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Shoot and edit weekly vlogs to build your creator empire.',
    requiresUpgrade: 'camera',
    defaultState: {
      active: false,
      buffer: 0,
      multiplier: 1
    },
    details: [
      () => '⏳ Setup Time: <strong>4h</strong>',
      () => '💵 Setup Cost: <strong>$150</strong>',
      () => '🛠 Maintenance: <strong>1h/day</strong>',
      () => renderAssetRequirementDetail('vlog'),
      () => {
        const asset = getAssetState('vlog');
        const income = 9 * asset.multiplier;
        return `💸 Income: <strong>$${formatMoney(income)} / 15s</strong>`;
      }
    ],
    action: {
      label: () => {
        const asset = getAssetState('vlog');
        if (asset.active) return 'Channel Running';
        if (!assetRequirementsMetById('vlog')) {
          return formatAssetRequirementLabel('vlog');
        }
        return 'Launch Channel';
      },
      className: 'primary',
      disabled: () => {
        const asset = getAssetState('vlog');
        if (asset.active) return true;
        if (!assetRequirementsMetById('vlog')) return true;
        if (state.timeLeft < 4) return true;
        if (state.money < 150) return true;
        return false;
      },
      onClick: () => executeAction(() => {
        const asset = getAssetState('vlog');
        if (asset.active || !assetRequirementsMetById('vlog')) {
          addLog('You need the right gear before filming can begin.', 'info');
          return;
        }
        spendTime(4);
        spendMoney(150);
        asset.active = true;
        asset.buffer = 0;
        addLog('Lights, camera, payout! Your vlog channel is live and ready to monetize every 15 seconds.', 'passive');
      }, { checkDay: true })
    },
    passiveIncome: {
      interval: 15,
      logType: 'passive',
      message: amount => `Your vlog racked up views for $${formatMoney(amount)} while you edited thumbnails.`,
      offlineMessage: total => `Your vlog library brought in $${formatMoney(total)} while you were AFK. Influencer vibes!`
    },
    isActive: (_state, assetState) => assetState.active,
    getIncomeAmount: (_state, assetState) => 9 * assetState.multiplier,
    cardState: (_state, card) => updateAssetCardLock('vlog', card)
  },
  {
    id: 'podcast',
    name: 'Podcast Series',
    tag: { label: 'Passive', type: 'passive' },
    description: 'Record interviews and schedule drops that keep listeners binging.',
    requiresUpgrade: 'studio',
    defaultState: {
      active: false,
      buffer: 0,
      multiplier: 1
    },
    details: [
      () => '⏳ Setup Time: <strong>5h</strong>',
      () => '💵 Setup Cost: <strong>$220</strong>',
      () => '🛠 Maintenance: <strong>1.5h/day</strong>',
      () => renderAssetRequirementDetail('podcast'),
      () => {
        const asset = getAssetState('podcast');
        const income = 25 * asset.multiplier;
        return `💸 Income: <strong>$${formatMoney(income)} / 30s</strong>`;
      }
    ],
    action: {
      label: () => {
        const asset = getAssetState('podcast');
        if (asset.active) return 'Podcast Syndicated';
        if (!assetRequirementsMetById('podcast')) {
          return formatAssetRequirementLabel('podcast');
        }
        return 'Produce Season';
      },
      className: 'primary',
      disabled: () => {
        const asset = getAssetState('podcast');
        if (asset.active) return true;
        if (!assetRequirementsMetById('podcast')) return true;
        if (state.timeLeft < 5) return true;
        if (state.money < 220) return true;
        return false;
      },
      onClick: () => executeAction(() => {
        const asset = getAssetState('podcast');
        if (asset.active || !assetRequirementsMetById('podcast')) {
          addLog('Set up your studio before you can hit record on that podcast.', 'info');
          return;
        }
        spendTime(5);
        spendMoney(220);
        asset.active = true;
        asset.buffer = 0;
        addLog('Your podcast season is queued! Sponsors drip $25 every 30 seconds while episodes drop.', 'passive');
      }, { checkDay: true })
    },
    passiveIncome: {
      interval: 30,
      logType: 'passive',
      message: amount => `Podcast downloads surged, netting $${formatMoney(amount)} in sponsor cash.`,
      offlineMessage: total => `Your podcast backlog pulled $${formatMoney(total)} while you were off-mic. Nice!`
    },
    isActive: (_state, assetState) => assetState.active,
    getIncomeAmount: (_state, assetState) => 25 * assetState.multiplier,
    cardState: (_state, card) => updateAssetCardLock('podcast', card)
  }
];

const UPGRADES = [
  {
    id: 'assistant',
    name: 'Hire Virtual Assistant',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Add +2h to your daily grind. They handle the boring stuff.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$180</strong>'
    ],
    action: {
      label: () => getUpgradeState('assistant').purchased ? 'Assistant Hired' : 'Hire Assistant',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('assistant');
        return upgrade.purchased || state.money < 180;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('assistant');
        if (upgrade.purchased) return;
        spendMoney(180);
        upgrade.purchased = true;
        state.bonusTime += 2;
        gainTime(2);
        addLog('You hired a virtual assistant who adds +2h to your day and handles inbox chaos.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const purchased = getUpgradeState('assistant').purchased;
      card.classList.toggle('locked', purchased);
    }
  },
  {
    id: 'camera',
    name: 'Buy Camera',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Unlocks video production gear so you can start a vlog channel.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$200</strong>',
      () => 'Unlocks: <strong>Vlog Channel</strong>'
    ],
    action: {
      label: () => getUpgradeState('camera').purchased ? 'Camera Ready' : 'Purchase Camera',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('camera');
        if (upgrade.purchased) return true;
        return state.money < 200;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('camera');
        if (upgrade.purchased) return;
        spendMoney(200);
        upgrade.purchased = true;
        addLog('You bought a mirrorless camera rig. The vlog channel card just unlocked!', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('camera');
      card.classList.toggle('locked', upgrade.purchased);
    }
  },
  {
    id: 'studio',
    name: 'Studio Setup',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Soundproofing, mixers, and lights so your podcast sounds pro.',
    defaultState: {
      purchased: false
    },
    details: [
      () => '💵 Cost: <strong>$260</strong>',
      () => 'Unlocks: <strong>Podcast Series</strong>'
    ],
    action: {
      label: () => getUpgradeState('studio').purchased ? 'Studio Ready' : 'Build Studio',
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('studio');
        if (upgrade.purchased) return true;
        return state.money < 260;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('studio');
        if (upgrade.purchased) return;
        spendMoney(260);
        upgrade.purchased = true;
        addLog('Podcast studio assembled! Your podcast asset is ready to produce seasons.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('studio');
      card.classList.toggle('locked', upgrade.purchased);
    }
  },
  {
    id: 'coffee',
    name: 'Turbo Coffee',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Instantly gain +1h of focus for today. Side effects include jittery success.',
    defaultState: {
      usedToday: 0
    },
    details: [
      () => '💵 Cost: <strong>$40</strong>',
      () => `Daily limit: <strong>${COFFEE_LIMIT}</strong>`
    ],
    action: {
      label: () => {
        const upgrade = getUpgradeState('coffee');
        return upgrade.usedToday >= COFFEE_LIMIT ? 'Too Much Caffeine' : 'Brew Boost';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('coffee');
        return state.money < 40 || upgrade.usedToday >= COFFEE_LIMIT || state.timeLeft <= 0;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('coffee');
        if (upgrade.usedToday >= COFFEE_LIMIT) return;
        spendMoney(40);
        upgrade.usedToday += 1;
        state.dailyBonusTime += 1;
        gainTime(1);
        addLog('Turbo coffee acquired! You feel invincible for another hour (ish).', 'boost');
      })
    }
  },
  {
    id: 'course',
    name: 'Automation Course',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Unlocks smarter blogging tools, boosting passive income by +50%.',
    defaultState: {
      purchased: false
    },
    initialClasses: ['locked'],
    details: [
      () => '💵 Cost: <strong>$260</strong>',
      () => 'Requires active blog'
    ],
    action: {
      label: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return 'Automation Ready';
        return getAssetState('blog').instances.length ? 'Study Up' : 'Requires Active Blog';
      },
      className: 'secondary',
      disabled: () => {
        const upgrade = getUpgradeState('course');
        if (upgrade.purchased) return true;
        const blogActive = getAssetState('blog').instances.length > 0;
        if (!blogActive) return true;
        return state.money < 260;
      },
      onClick: () => executeAction(() => {
        const upgrade = getUpgradeState('course');
        const blog = getAssetState('blog');
        if (upgrade.purchased || !blog.instances.length) return;
        spendMoney(260);
        upgrade.purchased = true;
        blog.multiplier = 1.5;
        addLog('Automation course complete! Your blog now earns +50% more while you nap.', 'upgrade');
      })
    },
    cardState: (_state, card) => {
      const upgrade = getUpgradeState('course');
      const blogActive = getAssetState('blog').instances.length > 0;
      card.classList.toggle('locked', !blogActive && !upgrade.purchased);
    }
  }
];

const HUSTLE_MAP = new Map(HUSTLES.map(item => [item.id, item]));
const ASSET_MAP = new Map(ASSETS.map(item => [item.id, item]));
const UPGRADE_MAP = new Map(UPGRADES.map(item => [item.id, item]));

function isUpgradePurchased(id) {
  if (!id) return true;
  return !!getUpgradeState(id).purchased;
}

function normalizeAssetRequirement(def) {
  if (!def || !def.requiresUpgrade) return [];
  return Array.isArray(def.requiresUpgrade) ? def.requiresUpgrade : [def.requiresUpgrade];
}

function assetRequirementsMet(def) {
  const requirements = normalizeAssetRequirement(def);
  return requirements.every(isUpgradePurchased);
}

function assetRequirementsMetById(id) {
  const def = ASSET_MAP.get(id);
  if (!def) return true;
  return assetRequirementsMet(def);
}

function missingAssetRequirements(def) {
  const requirements = normalizeAssetRequirement(def);
  return requirements.filter(req => !isUpgradePurchased(req));
}

function formatAssetRequirementLabel(assetId) {
  const def = ASSET_MAP.get(assetId);
  if (!def) return 'Requirement Missing';
  const missing = missingAssetRequirements(def);
  if (!missing.length) return 'Ready to Launch';
  const names = missing.map(id => UPGRADE_MAP.get(id)?.name || id);
  return `Requires ${names.join(' & ')}`;
}

function renderAssetRequirementDetail(assetId) {
  const def = ASSET_MAP.get(assetId);
  if (!def) return '';
  const requirements = normalizeAssetRequirement(def);
  if (!requirements.length) {
    return '🔓 Requirements: <strong>None</strong>';
  }
  const parts = requirements.map(id => {
    const upgradeDef = UPGRADE_MAP.get(id);
    const purchased = isUpgradePurchased(id);
    const icon = purchased ? '✅' : '🔒';
    const label = upgradeDef ? upgradeDef.name : id;
    const status = purchased ? 'Unlocked' : 'Locked';
    return `${icon} <strong>${label}</strong> (${status})`;
  });
  return `Requirements: ${parts.join(' & ')}`;
}

function updateAssetCardLock(assetId, card) {
  const def = ASSET_MAP.get(assetId);
  if (!def || !card) return;
  const assetState = getAssetState(assetId);
  const locked = !assetRequirementsMet(def) && !assetState.active;
  card.classList.toggle('locked', locked);
}

const DEFAULT_STATE = buildDefaultState();
let state = structuredClone(DEFAULT_STATE);
let lastTick = Date.now();

const moneyEl = document.getElementById('money');
const timeEl = document.getElementById('time');
const timeProgressEl = document.getElementById('time-progress');
const dayEl = document.getElementById('day');
const logFeed = document.getElementById('log-feed');
const logTemplate = document.getElementById('log-template');
const logTip = document.getElementById('log-tip');
const hustleGrid = document.getElementById('hustle-grid');
const assetGrid = document.getElementById('asset-grid');
const upgradeGrid = document.getElementById('upgrade-grid');
const endDayBtn = document.getElementById('end-day');

function structuredClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function normalizeAssetInstance(instance = {}) {
  const normalized = { ...instance };
  if (!normalized.id) {
    normalized.id = createId();
  }
  const numericBuffer = Number(normalized.buffer);
  normalized.buffer = Number.isFinite(numericBuffer) ? numericBuffer : 0;
  if (typeof normalized.startedAt !== 'number' || Number.isNaN(normalized.startedAt)) {
    normalized.startedAt = Date.now();
  }
  return normalized;
}

function createAssetInstance(overrides = {}) {
  return normalizeAssetInstance({ ...overrides });
}

function normalizeAssetState(def, assetState = {}) {
  const defaults = structuredClone(def.defaultState || {});
  const merged = { ...defaults, ...assetState };

  const multiplierDefault = typeof defaults.multiplier === 'number' ? defaults.multiplier : 1;
  const parsedMultiplier = Number(merged.multiplier);
  merged.multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : multiplierDefault;

  if (!Array.isArray(merged.instances)) {
    merged.instances = [];
  }

  const parsedBuffer = Number(merged.buffer);
  const legacyBuffer = Number.isFinite(parsedBuffer) ? parsedBuffer : 0;
  const hadLegacyActive = Boolean(merged.active);

  if ((hadLegacyActive || legacyBuffer) && merged.instances.length === 0) {
    merged.instances.push(createAssetInstance({ buffer: legacyBuffer }));
  }

  merged.instances = merged.instances.map(normalizeAssetInstance);

  delete merged.active;
  delete merged.buffer;

  return merged;
}

function ensureStateShape(target = state) {
  target.hustles = target.hustles || {};
  for (const def of HUSTLES) {
    const defaults = structuredClone(def.defaultState || {});
    const existing = target.hustles[def.id];
    target.hustles[def.id] = existing ? { ...defaults, ...existing } : defaults;
  }

  target.assets = target.assets || {};
  for (const def of ASSETS) {
    const existing = target.assets[def.id];
    target.assets[def.id] = normalizeAssetState(def, existing || {});
    target.assets[def.id] = existing ? { ...defaults, ...existing } : defaults;
    if (target.assets[def.id].fundedToday === undefined) {
      target.assets[def.id].fundedToday = !!target.assets[def.id].active;
    }
  }

  target.upgrades = target.upgrades || {};
  for (const def of UPGRADES) {
    const defaults = structuredClone(def.defaultState || {});
    const existing = target.upgrades[def.id];
    target.upgrades[def.id] = existing ? { ...defaults, ...existing } : defaults;
  }
}

function buildDefaultState() {
  const base = {
    money: 45,
    timeLeft: 14,
    baseTime: 14,
    bonusTime: 0,
    dailyBonusTime: 0,
    day: 1,
    hustles: {},
    assets: {},
    upgrades: {},
    log: [],
    lastSaved: Date.now()
  };
  ensureStateShape(base);
  return base;
}

function getHustleState(id, target = state) {
  target.hustles = target.hustles || {};
  if (!target.hustles[id]) {
    const def = HUSTLE_MAP.get(id);
    target.hustles[id] = structuredClone(def?.defaultState || {});
  }
  return target.hustles[id];
}

function getAssetState(id, target = state) {
  target.assets = target.assets || {};
  const def = ASSET_MAP.get(id);
  if (!def) {
    if (!target.assets[id]) {
      target.assets[id] = {};
    }
    return target.assets[id];
  }
  target.assets[id] = normalizeAssetState(def, target.assets[id] || {});
  return target.assets[id];
}

function getUpgradeState(id, target = state) {
  target.upgrades = target.upgrades || {};
  if (!target.upgrades[id]) {
    const def = UPGRADE_MAP.get(id);
    target.upgrades[id] = structuredClone(def?.defaultState || {});
  }
  return target.upgrades[id];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved.assets && saved.blog) {
        state = migrateLegacyState(saved);
      } else {
        state = {
          ...structuredClone(DEFAULT_STATE),
          ...saved,
          hustles: {
            ...structuredClone(DEFAULT_STATE.hustles),
            ...(saved.hustles || {})
          },
          assets: {
            ...structuredClone(DEFAULT_STATE.assets),
            ...(saved.assets || {})
          },
          upgrades: {
            ...structuredClone(DEFAULT_STATE.upgrades),
            ...(saved.upgrades || {})
          },
          log: saved.log || []
        };
      }
      ensureStateShape(state);
      handleOfflineProgress(saved.lastSaved || Date.now());
      addLog('Welcome back! Your hustles kept buzzing while you were away.', 'info');
    } else {
      state = structuredClone(DEFAULT_STATE);
      ensureStateShape(state);
      addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info');
    }
  } catch (err) {
    console.error('Failed to load state', err);
    state = structuredClone(DEFAULT_STATE);
    ensureStateShape(state);
  }
  lastTick = Date.now();
  renderLog();
}

function migrateLegacyState(saved) {
  const migrated = structuredClone(DEFAULT_STATE);
  migrated.money = saved.money ?? migrated.money;
  migrated.timeLeft = saved.timeLeft ?? migrated.timeLeft;
  migrated.baseTime = saved.baseTime ?? migrated.baseTime;
  migrated.bonusTime = saved.bonusTime ?? migrated.bonusTime;
  migrated.dailyBonusTime = saved.dailyBonusTime ?? migrated.dailyBonusTime;
  migrated.day = saved.day ?? migrated.day;
  migrated.lastSaved = saved.lastSaved || Date.now();

  if (saved.blog) {
    const blogState = getAssetState('blog', migrated);
    const legacyInstances = Array.isArray(saved.blog.instances)
      ? saved.blog.instances.map(createAssetInstance)
      : [];
    const buffer = Number(saved.blog.buffer) || 0;
    const hadLegacyInstance = Boolean(saved.blog.active) || buffer > 0;

    if (legacyInstances.length) {
      blogState.instances = legacyInstances;
    } else if (hadLegacyInstance) {
      blogState.instances = [createAssetInstance({ buffer })];
    } else {
      blogState.instances = [];
    }

    const multiplier = Number(saved.blog.multiplier);
    if (Number.isFinite(multiplier) && multiplier > 0) {
      blogState.multiplier = multiplier;
    }
  }

  if (Array.isArray(saved.pendingFlips)) {
    getHustleState('flips', migrated).pending = saved.pendingFlips;
  }

  if (saved.assistantHired) {
    getUpgradeState('assistant', migrated).purchased = true;
  }

  getUpgradeState('coffee', migrated).usedToday = saved.coffeesToday || 0;

  if (saved.coursePurchased) {
    getUpgradeState('course', migrated).purchased = true;
    const blogState = getAssetState('blog', migrated);
    blogState.multiplier = saved.blog?.multiplier || blogState.multiplier;
  }

  migrated.log = saved.log || [];
  return migrated;
}

function saveState() {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save game', err);
  }
}

function handleOfflineProgress(lastSaved) {
  const now = Date.now();
  const elapsed = Math.max(0, (now - lastSaved) / 1000);
  if (!elapsed) return;

  for (const asset of ASSETS) {
    if (!asset.passiveIncome) continue;
    if (asset.isActive && !asset.isActive(state, getAssetState(asset.id))) continue;
    const earned = collectPassiveIncome(asset, elapsed, true);
    if (earned > 0 && asset.passiveIncome.offlineMessage) {
      addLog(asset.passiveIncome.offlineMessage(earned), asset.passiveIncome.logType || 'passive');
    }
  }

  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      const result = hustle.process(now, true);
      if (result && result.offlineLog) {
        addLog(result.offlineLog.message, result.offlineLog.type || 'info');
      }
    }
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function formatList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, and ${tail}`;
}

function formatHours(hours) {
  if (Math.abs(hours - Math.round(hours)) < 0.05) {
    return `${Math.round(hours)}h`;
  }
  return `${hours.toFixed(1)}h`;
}

function addMoney(amount, message, type = 'info') {
  state.money = Math.max(0, Number(state.money) + Number(amount));
  flashValue(moneyEl);
  if (message) {
    addLog(message, type);
  }
}

function spendMoney(amount) {
  state.money = Math.max(0, state.money - amount);
  flashValue(moneyEl, true);
}

function spendTime(hours) {
  state.timeLeft = Math.max(0, state.timeLeft - hours);
}

function gainTime(hours) {
  state.timeLeft = Math.min(getTimeCap(), state.timeLeft + hours);
}

function flashValue(el, negative = false) {
  const className = negative ? 'flash-negative' : 'flash';
  el.classList.remove('flash', 'flash-negative');
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 500);
}

function addLog(message, type = 'info') {
  const entry = {
    id: createId(),
    timestamp: Date.now(),
    message,
    type
  };
  state.log.push(entry);
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log.splice(0, state.log.length - MAX_LOG_ENTRIES);
  }
  renderLog();
}

function renderLog() {
  if (!state.log.length) {
    logTip.style.display = 'block';
    logFeed.innerHTML = '';
    return;
  }
  logTip.style.display = 'none';
  logFeed.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const entries = [...state.log].sort((a, b) => b.timestamp - a.timestamp);
  for (const item of entries) {
    const node = logTemplate.content.cloneNode(true);
    const entryEl = node.querySelector('.log-entry');
    entryEl.classList.add(`type-${item.type}`);
    node.querySelector('.timestamp').textContent = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    node.querySelector('.message').textContent = item.message;
    fragment.appendChild(node);
  }
  logFeed.appendChild(fragment);
  logFeed.scrollTop = 0;
}

function getTimeCap() {
  return state.baseTime + state.bonusTime + state.dailyBonusTime;
}

function executeAction(effect, options = {}) {
  if (typeof effect === 'function') {
    effect();
  }
  if (options.checkDay) {
    checkDayEnd();
  }
  updateUI();
  saveState();
}

function renderCards() {
  renderCollection(HUSTLES, hustleGrid);
  renderCollection(ASSETS, assetGrid);
  renderCollection(UPGRADES, upgradeGrid);
}

function renderCollection(definitions, container) {
  container.innerHTML = '';
  for (const def of definitions) {
    createCard(def, container);
  }
}

function createCard(def, container) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `${def.id}-card`;
  if (Array.isArray(def.initialClasses)) {
    for (const cls of def.initialClasses) {
      card.classList.add(cls);
    }
  }

  const header = document.createElement('div');
  header.className = 'card-header';
  const title = document.createElement('h3');
  title.textContent = def.name;
  header.appendChild(title);
  if (def.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = `tag ${def.tag.type || ''}`.trim();
    tagEl.textContent = def.tag.label;
    header.appendChild(tagEl);
  }
  card.appendChild(header);

  if (def.description) {
    const description = document.createElement('p');
    description.textContent = def.description;
    card.appendChild(description);
  }

  const detailEntries = [];
  if (def.details && def.details.length) {
    const list = document.createElement('ul');
    list.className = 'details';
    for (const detail of def.details) {
      const li = document.createElement('li');
      li.innerHTML = typeof detail === 'function' ? detail(state) : detail;
      list.appendChild(li);
      detailEntries.push({ render: detail, element: li });
    }
    card.appendChild(list);
  }

  let button = null;
  if (def.action) {
    button = document.createElement('button');
    button.className = def.action.className || 'primary';
    const label = typeof def.action.label === 'function' ? def.action.label(state) : def.action.label;
    button.textContent = label;
    button.disabled = typeof def.action.disabled === 'function' ? def.action.disabled(state) : !!def.action.disabled;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      def.action.onClick();
    });
    card.appendChild(button);
  }

  const extra = typeof def.extraContent === 'function' ? (def.extraContent(card, state) || {}) : {};

  container.appendChild(card);
  def.ui = {
    card,
    button,
    details: detailEntries,
    extra
  };
}

function updateCard(def) {
  if (!def.ui) return;
  for (const detail of def.ui.details) {
    if (typeof detail.render === 'function') {
      detail.element.innerHTML = detail.render(state);
    }
  }
  if (def.action && def.ui.button) {
    const label = typeof def.action.label === 'function' ? def.action.label(state) : def.action.label;
    def.ui.button.textContent = label;
    const disabled = typeof def.action.disabled === 'function' ? def.action.disabled(state) : !!def.action.disabled;
    def.ui.button.disabled = disabled;
  }
  if (typeof def.cardState === 'function') {
    def.cardState(state, def.ui.card);
  }
  if (typeof def.update === 'function') {
    def.update(state, def.ui);
  }
}

function updateUI() {
  moneyEl.textContent = `$${formatMoney(state.money)}`;
  timeEl.textContent = `${formatHours(state.timeLeft)} / ${formatHours(getTimeCap())}`;
  dayEl.textContent = state.day;

  const cap = getTimeCap();
  const percent = cap === 0 ? 0 : Math.min(100, Math.max(0, (state.timeLeft / cap) * 100));
  timeProgressEl.style.width = `${percent}%`;

  for (const def of HUSTLES) {
    updateCard(def);
  }
  for (const def of ASSETS) {
    updateCard(def);
  }
  for (const def of UPGRADES) {
    updateCard(def);
  }
}

function scheduleFlip() {
  const flipState = getHustleState('flips');
  flipState.pending.push({
    id: createId(),
    readyAt: Date.now() + 30000,
    payout: 48
  });
}

function updateFlipStatus(element) {
  if (!element) return;
  const flipState = getHustleState('flips');
  if (!flipState.pending.length) {
    element.textContent = 'No flips in progress.';
    return;
  }
  const now = Date.now();
  const nextFlip = flipState.pending.reduce((soonest, flip) =>
    flip.readyAt < soonest.readyAt ? flip : soonest
  );
  const timeRemaining = Math.max(0, Math.round((nextFlip.readyAt - now) / 1000));
  const label = timeRemaining === 0 ? 'any moment' : `${timeRemaining}s`;
  const descriptor = flipState.pending.length === 1 ? 'flip' : 'flips';
  element.textContent = `${flipState.pending.length} ${descriptor} in progress. Next payout in ${label}.`;
}

function renderBlogInstances(container) {
  if (!container) return;
  const asset = getAssetState('blog');
  container.innerHTML = '';

  if (!asset.instances.length) {
    const empty = document.createElement('p');
    empty.className = 'instance-empty';
    empty.textContent = 'No blogs are running yet.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'instance-list';

  asset.instances.forEach((instance, index) => {
    const item = document.createElement('li');
    item.className = 'instance-row';

    const label = document.createElement('span');
    label.className = 'instance-label';
    label.textContent = `Blog #${index + 1}`;

    const status = document.createElement('span');
    status.className = 'instance-status';
    const perInstance = BLOG_CHUNK * asset.multiplier;
    status.textContent = `$${formatMoney(perInstance)} / 10s`;

    item.appendChild(label);
    item.appendChild(status);
    list.appendChild(item);
  });

  container.appendChild(list);
}

function collectPassiveIncome(assetDef, elapsedSeconds, offline = false) {
  if (!assetDef.passiveIncome) return 0;
  const assetState = getAssetState(assetDef.id);
  if (assetDef.isActive && !assetDef.isActive(state, assetState)) return 0;
  if (!assetDef.passiveIncome.interval) return 0;

  const instances = Array.isArray(assetState.instances) ? assetState.instances : [];
  let payouts = 0;

  for (const instance of instances) {
    const chunkValue = assetDef.getIncomeAmount ? assetDef.getIncomeAmount(state, assetState, instance) : 0;
    if (!chunkValue) continue;

    const ratePerSecond = chunkValue / assetDef.passiveIncome.interval;
    instance.buffer += ratePerSecond * elapsedSeconds;

    while (instance.buffer >= chunkValue) {
      instance.buffer -= chunkValue;
      payouts += chunkValue;
      if (offline) {
        state.money += chunkValue;
      } else {
        addMoney(
          chunkValue,
          assetDef.passiveIncome.message ? assetDef.passiveIncome.message(chunkValue) : null,
          assetDef.passiveIncome.logType || 'passive'
        );
      }
    }
  }

  return payouts;
}

function processFlipPayouts(now = Date.now(), offline = false) {
  const flipState = getHustleState('flips');
  if (!flipState.pending.length) {
    return { changed: false };
  }

  const remaining = [];
  let completed = 0;
  let offlineTotal = 0;

  for (const flip of flipState.pending) {
    if (flip.readyAt <= now) {
      completed += 1;
      if (offline) {
        state.money += flip.payout;
        offlineTotal += flip.payout;
      } else {
        addMoney(flip.payout, `Your eBay flip sold for $${formatMoney(flip.payout)}! Shipping label time.`, 'delayed');
      }
    } else {
      remaining.push(flip);
    }
  }

  flipState.pending = remaining;

  if (!completed) {
    return { changed: false };
  }

  const result = { changed: true };
  if (offline && offlineTotal > 0) {
    result.offlineLog = {
      message: `While you were away, ${completed} eBay ${completed === 1 ? 'flip' : 'flips'} paid out. $${formatMoney(offlineTotal)} richer!`,
      type: 'delayed'
    };
  }
  return result;
}

function closeOutDay() {
  const unfunded = [];

  for (const asset of ASSETS) {
    const assetState = getAssetState(asset.id);
    if (!assetState.active) {
      assetState.fundedToday = false;
      continue;
    }

    if (assetState.fundedToday) {
      if (asset.dailyPayout) {
        addMoney(
          asset.dailyPayout,
          `${asset.name} delivered its $${formatMoney(asset.dailyPayout)} daily payout after proper upkeep.`,
          'passive'
        );
      }
    } else if (asset.dailyPayout) {
      unfunded.push(asset.name);
    }

    assetState.fundedToday = false;
  }

  if (unfunded.length) {
    addLog(
      `${formatList(unfunded)} couldn't stay online without maintenance today. No daily payout for them.`,
      'warning'
    );
  }
}

function allocateAssetMaintenance() {
  const funded = [];
  const skipped = [];

  for (const asset of ASSETS) {
    const assetState = getAssetState(asset.id);
    if (!assetState.active) {
      assetState.fundedToday = false;
      continue;
    }

    const maintenance = Number(asset.maintenanceTime) || 0;
    if (maintenance <= 0) {
      assetState.fundedToday = true;
      funded.push(asset.name);
      continue;
    }

    if (state.timeLeft >= maintenance) {
      state.timeLeft -= maintenance;
      assetState.fundedToday = true;
      funded.push(asset.name);
    } else {
      assetState.fundedToday = false;
      skipped.push(asset.name);
    }
  }

  if (funded.length) {
    addLog(`You budgeted maintenance time for ${formatList(funded)}.`, 'info');
  }
  if (skipped.length) {
    addLog(
      `${formatList(skipped)} couldn't be maintained today and are paused until you free up more hours.`,
      'warning'
    );
  }
}

function endDay(auto = false) {
  closeOutDay();
  const message = auto ? 'You ran out of time. The grind resets tomorrow.' : 'You called it a day. Fresh hustle awaits tomorrow.';
  addLog(`${message} Day ${state.day + 1} begins with renewed energy.`, 'info');
  state.day += 1;
  state.dailyBonusTime = 0;
  getUpgradeState('coffee').usedToday = 0;
  state.timeLeft = getTimeCap();
  allocateAssetMaintenance();
  updateUI();
  saveState();
}

function checkDayEnd() {
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateUI();
    setTimeout(() => endDay(true), 400);
  }
}

function gameLoop() {
  const now = Date.now();
  const dt = Math.min(5, (now - lastTick) / 1000);
  lastTick = now;

  if (dt <= 0) return;

  for (const asset of ASSETS) {
    if (asset.passiveIncome) {
      collectPassiveIncome(asset, dt, false);
    }
  }

  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      hustle.process(now, false);
    }
  }

  updateUI();
  saveState();
}

endDayBtn.addEventListener('click', () => endDay(false));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    lastTick = Date.now();
  }
});

window.addEventListener('beforeunload', saveState);

loadState();
renderCards();
updateUI();
setInterval(gameLoop, 1000);
