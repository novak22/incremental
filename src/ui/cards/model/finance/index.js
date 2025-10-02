import { getAssetState, getState } from '../../../../core/state.js';
import { formatMoney } from '../../../../core/helpers.js';
import { computeDailySummary } from '../../../../game/summary.js';
import { getAssets, getHustles, getUpgrades } from '../../../../game/registryService.js';
import { calculateAssetSalePrice, instanceLabel } from '../../../../game/assets/helpers.js';
import { getKnowledgeProgress } from '../../../../game/requirements.js';
import { buildSkillRewards, resolveTrack } from '../education.js';
import { buildPulseSummary, computeTopEarner } from './pulse.js';
import { buildInflowLedger, buildOutflowLedger } from './ledger.js';
import { buildObligations } from './obligations.js';
import {
  buildAssetOpportunities,
  buildUpgradeOpportunities,
  buildHustleOpportunities,
  buildOpportunitySummary
} from './opportunities.js';
import { ensureArray, toCurrency } from './utils.js';

function buildPendingIncome(assetDefinitions = [], state, services = {}) {
  const {
    getAssetState: getAssetStateFn = getAssetState,
    instanceLabel: instanceLabelFn = instanceLabel
  } = services;

  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetStateFn(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      const pending = toCurrency(instance?.pendingIncome);
      if (pending <= 0) return;
      const breakdownEntries = ensureArray(instance?.lastIncomeBreakdown?.entries).map(entry => ({
        label: entry?.label || 'Modifier',
        amount: toCurrency(entry?.amount)
      }));
      entries.push({
        id: instance.id,
        assetId: definition.id,
        label: instanceLabelFn(definition, index),
        assetName: definition.singular || definition.name || definition.id,
        amount: pending,
        breakdown: breakdownEntries
      });
    });
  });
  return entries.sort((a, b) => b.amount - a.amount);
}

function buildAssetPerformance(assetDefinitions = [], state, services = {}) {
  const {
    getAssetState: getAssetStateFn = getAssetState,
    instanceLabel: instanceLabelFn = instanceLabel,
    calculateAssetSalePrice: calculateAssetSalePriceFn = calculateAssetSalePrice
  } = services;

  const currentDay = Math.max(1, Number(state?.day) || 1);
  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetStateFn(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active') return;
      const created = Math.max(1, Number(instance.createdOnDay) || currentDay);
      const daysActive = Math.max(1, currentDay - created + 1);
      const average = toCurrency(instance.totalIncome / daysActive);
      const latest = toCurrency(instance.lastIncome);
      const upkeep = toCurrency(Number(definition.maintenance?.cost) || 0);
      const saleValue = toCurrency(calculateAssetSalePriceFn(instance));
      entries.push({
        id: instance.id,
        assetId: definition.id,
        label: instanceLabelFn(definition, index),
        assetName: definition.singular || definition.name || definition.id,
        average,
        latest,
        upkeep,
        saleValue
      });
    });
  });
  return entries.sort((a, b) => b.average - a.average);
}

function buildEducationInvestmentsForBank(educationDefinitions = [], state, services = {}) {
  const {
    resolveTrack: resolveTrackFn = resolveTrack,
    getKnowledgeProgress: getKnowledgeProgressFn = getKnowledgeProgress,
    buildSkillRewards: buildSkillRewardsFn = buildSkillRewards
  } = services;

  const entries = [];
  educationDefinitions.forEach(definition => {
    const track = resolveTrackFn(definition);
    const progress = getKnowledgeProgressFn(track.id, state);
    if (!progress.enrolled) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewardsFn(track.id);
    const skillNames = ensureArray(rewards.skills).map(skill => skill.name).filter(Boolean);
    const bonusParts = [];
    if (rewards.xp > 0) {
      bonusParts.push(`${rewards.xp} XP`);
    }
    if (skillNames.length) {
      bonusParts.push(skillNames.join(', '));
    }
    entries.push({
      id: track.id,
      name: track.name,
      tuition: toCurrency(track.tuition),
      remainingDays,
      totalDays: track.days,
      hoursPerDay: track.hoursPerDay,
      studiedToday: Boolean(progress.studiedToday),
      bonus: bonusParts.join(' • ') || track.summary
    });
  });
  return entries.sort((a, b) => a.remainingDays - b.remainingDays);
}

function sanitizeHistoryLedger(entries = [], valueKey = 'amount') {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(entry => {
      const raw = Number(entry?.[valueKey]);
      const numeric = Number.isFinite(raw)
        ? valueKey === 'hours'
          ? Math.round(raw * 100) / 100
          : toCurrency(raw)
        : 0;
      return {
        key: entry?.key,
        label: entry?.label,
        category: entry?.category || 'general',
        [valueKey]: numeric
      };
    })
    .filter(entry => entry?.[valueKey] > 0)
    .sort((a, b) => b[valueKey] - a[valueKey]);
}

function buildCashHistory(state) {
  if (!state || !Array.isArray(state.metrics?.history)) return [];
  const recent = state.metrics.history.slice(-7);
  return recent
    .map((entry, index) => {
      const income = toCurrency(entry?.totals?.income);
      const spend = toCurrency(entry?.totals?.spend);
      const net = toCurrency(entry?.totals?.net ?? income - spend);
      const tone = net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';
      const recordedAt = Number(entry?.recordedAt);
      const dayNumber = Number(entry?.day);
      return {
        id: `history-${dayNumber || index}-${recordedAt || index}`,
        day: Number.isFinite(dayNumber) ? dayNumber : null,
        label: Number.isFinite(dayNumber) ? `Day ${dayNumber}` : 'Earlier',
        recordedAt: Number.isFinite(recordedAt) ? recordedAt : null,
        totals: {
          income,
          spend,
          net
        },
        tone,
        summary: entry?.summary || null,
        ledger: {
          payouts: sanitizeHistoryLedger(entry?.ledger?.payouts, 'amount'),
          costs: sanitizeHistoryLedger(entry?.ledger?.costs, 'amount'),
          time: sanitizeHistoryLedger(entry?.ledger?.time, 'hours')
        }
      };
    })
    .reverse();
}

const LOG_TONE = {
  success: 'positive',
  progress: 'positive',
  passive: 'positive',
  warning: 'negative',
  danger: 'negative',
  error: 'negative'
};

function resolveActivityTone(type) {
  return LOG_TONE[type] || 'neutral';
}

function buildActivityFeed(state) {
  if (!state || !Array.isArray(state.log)) return [];
  return state.log
    .slice(-10)
    .map((entry, index) => {
      const timestamp = Number(entry?.timestamp);
      return {
        id: entry?.id || `activity-${index}`,
        message: entry?.message || '',
        type: entry?.type || 'info',
        tone: resolveActivityTone(entry?.type),
        timestamp: Number.isFinite(timestamp) ? timestamp : null
      };
    })
    .reverse();
}

export function buildFinanceModel(registries = {}, helpers = {}, injected = {}) {
  const {
    getState: getStateFn = getState,
    computeDailySummary: computeDailySummaryFn = computeDailySummary,
    getAssets: getAssetsFn = getAssets,
    getUpgrades: getUpgradesFn = getUpgrades,
    getHustles: getHustlesFn = getHustles,
    buildPulseSummary: buildPulseSummaryFn = buildPulseSummary,
    computeTopEarner: computeTopEarnerFn = computeTopEarner,
    buildInflowLedger: buildInflowLedgerFn = buildInflowLedger,
    buildOutflowLedger: buildOutflowLedgerFn = buildOutflowLedger,
    buildObligations: buildObligationsFn = buildObligations,
    buildAssetOpportunities: buildAssetOpportunitiesFn = buildAssetOpportunities,
    buildUpgradeOpportunities: buildUpgradeOpportunitiesFn = buildUpgradeOpportunities,
    buildHustleOpportunities: buildHustleOpportunitiesFn = buildHustleOpportunities,
    buildOpportunitySummary: buildOpportunitySummaryFn = buildOpportunitySummary,
    buildPendingIncome: buildPendingIncomeFn = buildPendingIncome,
    buildAssetPerformance: buildAssetPerformanceFn = buildAssetPerformance,
    buildEducationInvestments: buildEducationInvestmentsFn = buildEducationInvestmentsForBank,
    buildCashHistory: buildCashHistoryFn = buildCashHistory,
    buildActivityFeed: buildActivityFeedFn = buildActivityFeed,
    toCurrency: toCurrencyFn = toCurrency
  } = injected;

  const state = getStateFn();
  if (!state) {
    return {
      header: null,
      ledger: { inflows: [], outflows: [] },
      obligations: { entries: [], quick: null },
      pendingIncome: [],
      assetPerformance: [],
      opportunities: buildOpportunitySummaryFn([], [], []),
      education: [],
      summary: null,
      history: [],
      activity: []
    };
  }

  const summary = computeDailySummaryFn(state);
  const assetDefinitions = Array.isArray(registries?.assets) ? registries.assets : getAssetsFn();
  const upgradeDefinitions = Array.isArray(registries?.upgrades) ? registries.upgrades : getUpgradesFn();
  const hustleDefinitions = Array.isArray(registries?.hustles) ? registries.hustles : getHustlesFn();
  const educationDefinitions = Array.isArray(registries?.education) ? registries.education : [];

  const inflows = buildInflowLedgerFn(summary);
  const outflows = buildOutflowLedgerFn(summary);
  const obligations = buildObligationsFn(state, assetDefinitions, educationDefinitions, helpers);
  const pendingIncome = buildPendingIncomeFn(assetDefinitions, state, helpers);
  const assetPerformance = buildAssetPerformanceFn(assetDefinitions, state, helpers);
  const opportunities = buildOpportunitySummaryFn(
    buildAssetOpportunitiesFn(assetDefinitions, state, helpers),
    buildUpgradeOpportunitiesFn(upgradeDefinitions, state, helpers),
    buildHustleOpportunitiesFn(hustleDefinitions, state, helpers)
  );
  const educationInvestments = buildEducationInvestmentsFn(educationDefinitions, state, helpers);
  const pulse = buildPulseSummaryFn(summary);
  const topEarner = computeTopEarnerFn(summary);

  const currentBalance = toCurrencyFn(state.money);
  const dailyIncome = toCurrencyFn(summary.totalEarnings);
  const dailySpend = toCurrencyFn(summary.totalSpend);
  const netDaily = toCurrencyFn(summary.totalEarnings - summary.totalSpend);

  const header = {
    currentBalance,
    netDaily,
    dailyIncome,
    dailySpend,
    lifetimeEarned: toCurrencyFn(state.totals?.earned),
    lifetimeSpent: toCurrencyFn(state.totals?.spent),
    pulse,
    quickObligation: obligations.quick,
    topEarner
  };

  const meta = netDaily !== 0
    ? `${netDaily >= 0 ? '+' : '-'}$${formatMoney(Math.abs(netDaily))} net today`
    : 'Cashflow steady today';

  return {
    header,
    ledger: { inflows, outflows },
    obligations,
    pendingIncome,
    assetPerformance,
    opportunities,
    education: educationInvestments,
    summary: { meta },
    history: buildCashHistoryFn(state),
    activity: buildActivityFeedFn(state)
  };
}

export default buildFinanceModel;
