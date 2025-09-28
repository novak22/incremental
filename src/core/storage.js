import { STORAGE_KEY } from './constants.js';
import { structuredClone } from './helpers.js';
import {
  buildDefaultState,
  ensureStateShape,
  getAssetState,
  getHustleState,
  getState,
  getUpgradeState,
  initializeState,
  replaceState,
  createAssetInstance
} from './state.js';
import { addLog } from './log.js';

export function loadState() {
  const defaultState = buildDefaultState();
  initializeState(defaultState);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info');
      return { state: getState(), returning: false, lastSaved: Date.now() };
    }

    const saved = JSON.parse(raw);
    let mergedState;

    if (!saved.assets && saved.blog) {
      mergedState = migrateLegacyState(saved, defaultState);
    } else {
      mergedState = {
        ...structuredClone(defaultState),
        ...saved,
        hustles: {
          ...structuredClone(defaultState.hustles),
          ...(saved.hustles || {})
        },
        assets: {
          ...structuredClone(defaultState.assets),
          ...(saved.assets || {})
        },
        upgrades: {
          ...structuredClone(defaultState.upgrades),
          ...(saved.upgrades || {})
        },
        log: saved.log || []
      };
    }

    replaceState(mergedState);
    ensureStateShape();
    const lastSaved = saved.lastSaved || Date.now();
    return { state: getState(), returning: true, lastSaved };
  } catch (err) {
    console.error('Failed to load state', err);
    initializeState(defaultState);
    return { state: getState(), returning: false, lastSaved: Date.now() };
  }
}

export function saveState() {
  const snapshot = structuredClone(getState());
  snapshot.lastSaved = Date.now();
  const state = getState();
  if (state) {
    state.lastSaved = snapshot.lastSaved;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error('Failed to save game', err);
  }
}

function migrateLegacyState(saved, defaultState) {
  const migrated = structuredClone(defaultState);
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
      ? saved.blog.instances.map(instance => createAssetInstance(instance))
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
