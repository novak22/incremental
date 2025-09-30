import { formatMoney, toNumber } from '../core/helpers.js';
import { getState } from '../core/state.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from './requirements.js';

function formatPercent(value) {
  const percent = toNumber(value) * 100;
  if (!Number.isFinite(percent)) return '0%';
  if (Math.abs(percent - Math.round(percent)) < 0.01) {
    return `${Math.round(percent)}%`;
  }
  return `${percent.toFixed(1)}%`;
}

function normalizeBoost(track, raw) {
  if (!raw) return null;
  const hustleId = raw.hustleId || null;
  const assetId = raw.assetId || null;
  if (!hustleId && !assetId) return null;
  const amount = toNumber(raw.amount ?? raw.value ?? raw.bonus, 0);
  if (amount === 0) return null;
  const type = raw.type === 'flat' ? 'flat' : 'multiplier';
  return {
    trackId: track.id,
    trackName: track.name,
    trackDetail: raw.trackDetail || null,
    hustleId,
    hustleName: raw.hustleName || hustleId,
    hustleDetail: raw.hustleDetail || null,
    assetId,
    assetName: raw.assetName || assetId,
    assetDetail: raw.assetDetail || null,
    label: raw.label || null,
    type,
    amount
  };
}

function buildBoostIndexes() {
  const byHustle = new Map();
  const byTrack = new Map();
  const byAsset = new Map();

  Object.values(KNOWLEDGE_TRACKS).forEach(track => {
    const entries = Array.isArray(track.instantBoosts) ? track.instantBoosts : [];
    entries
      .map(raw => normalizeBoost(track, raw))
      .filter(Boolean)
      .forEach(boost => {
        if (boost.hustleId) {
          if (!byHustle.has(boost.hustleId)) {
            byHustle.set(boost.hustleId, []);
          }
          byHustle.get(boost.hustleId).push(boost);
        }
        if (boost.assetId) {
          if (!byAsset.has(boost.assetId)) {
            byAsset.set(boost.assetId, []);
          }
          byAsset.get(boost.assetId).push(boost);
        }
        if (!byTrack.has(boost.trackId)) {
          byTrack.set(boost.trackId, []);
        }
        byTrack.get(boost.trackId).push(boost);
      });
  });

  return { byHustle, byTrack, byAsset };
}

const BOOST_INDEX = buildBoostIndexes();

export function getInstantHustleEducationBonuses(hustleId) {
  if (!hustleId) return [];
  return BOOST_INDEX.byHustle.get(hustleId) || [];
}

export function getAssetEducationBonuses(assetId) {
  if (!assetId) return [];
  return BOOST_INDEX.byAsset.get(assetId) || [];
}

export function describeInstantHustleEducationBonuses(hustleId) {
  return getInstantHustleEducationBonuses(hustleId).map(boost => () => {
    if (boost.hustleDetail) {
      return `🎓 ${boost.hustleDetail}`;
    }
    if (boost.label) {
      return `🎓 ${boost.label}`;
    }
    if (boost.type === 'multiplier') {
      return `🎓 ${boost.trackName} grads earn +${formatPercent(boost.amount)} here.`;
    }
    return `🎓 ${boost.trackName} adds +$${formatMoney(boost.amount)} per run.`;
  });
}

export function describeTrackEducationBonuses(trackId) {
  if (!trackId) return [];
  const boosts = BOOST_INDEX.byTrack.get(trackId) || [];
  return boosts.map(boost => () => {
    if (boost.trackDetail) {
      return `🎁 ${boost.trackDetail}`;
    }
    if (boost.label) {
      return `🎁 ${boost.label}`;
    }
    if (boost.assetId) {
      if (boost.type === 'multiplier') {
        return `🎁 Boosts ${boost.assetName} income by +${formatPercent(boost.amount)}.`;
      }
      return `🎁 Adds +$${formatMoney(boost.amount)} to ${boost.assetName} payouts.`;
    }
    if (boost.type === 'multiplier') {
      return `🎁 Boosts ${boost.hustleName} by +${formatPercent(boost.amount)}.`;
    }
    return `🎁 Adds +$${formatMoney(boost.amount)} to ${boost.hustleName}.`;
  });
}

export function applyInstantHustleEducationBonus({ hustleId, baseAmount, state = getState() }) {
  const base = toNumber(baseAmount, 0);
  const boosts = getInstantHustleEducationBonuses(hustleId);
  if (!boosts.length) {
    return { amount: base, applied: [], boosts: [] };
  }

  let multiplier = 1;
  let flat = 0;
  const applied = [];

  for (const boost of boosts) {
    const progress = getKnowledgeProgress(boost.trackId, state);
    if (!progress?.completed) continue;
    let extra = 0;
    if (boost.type === 'multiplier') {
      multiplier += boost.amount;
      extra = base * boost.amount;
    } else {
      flat += boost.amount;
      extra = boost.amount;
    }
    applied.push({ ...boost, extraAmount: extra });
  }

  const total = Math.max(0, base * multiplier + flat);
  return { amount: total, applied, boosts };
}

export function applyAssetIncomeEducationBonus({ assetId, baseAmount, state = getState() }) {
  const base = toNumber(baseAmount, 0);
  const boosts = getAssetEducationBonuses(assetId);
  if (!boosts.length) {
    return { amount: base, applied: [], boosts: [] };
  }

  let multiplier = 1;
  let flat = 0;
  const applied = [];

  for (const boost of boosts) {
    const progress = getKnowledgeProgress(boost.trackId, state);
    if (!progress?.completed) continue;
    let extra = 0;
    if (boost.type === 'multiplier') {
      multiplier += boost.amount;
      extra = base * boost.amount;
    } else {
      flat += boost.amount;
      extra = boost.amount;
    }
    applied.push({ ...boost, extraAmount: extra });
  }

  const total = Math.max(0, base * multiplier + flat);
  return { amount: total, applied, boosts };
}

export function formatEducationBonusSummary(applied = []) {
  const list = Array.isArray(applied) ? applied : [];
  if (!list.length) return '';
  const parts = list
    .filter(item => item.extraAmount)
    .map(item => `${item.trackName} +$${formatMoney(item.extraAmount)}`);
  return parts.join(' • ');
}
