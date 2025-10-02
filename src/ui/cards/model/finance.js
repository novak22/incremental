import { getAssetState, getState } from '../../../core/state.js';
import { formatMoney } from '../../../core/helpers.js';
import { computeDailySummary } from '../../../game/summary.js';
import { getAssets, getHustles, getUpgrades } from '../../../game/registryService.js';
import { getAssistantCount, getAssistantDailyCost } from '../../../game/assistant.js';
import { calculateAssetSalePrice, getDailyIncomeRange, instanceLabel } from '../../../game/assets/helpers.js';
import { describeHustleRequirements } from '../../../game/hustles/helpers.js';
import { getKnowledgeProgress } from '../../../game/requirements.js';
import { buildSkillRewards, resolveTrack } from './education.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { getUpgradeSnapshot } from './upgrades.js';

function toCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildPulseSummary(summary = {}) {
  const entries = [];
  const passiveBreakdown = ensureArray(summary.passiveBreakdown);
  const offlinePortion = passiveBreakdown
    .filter(entry => entry?.stream === 'offline')
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  const passiveOnly = Math.max(0, toCurrency(summary.passiveEarnings) - offlinePortion);
  const active = toCurrency(summary.activeEarnings);
  if (active > 0) {
    entries.push({ id: 'active', label: 'Active', amount: active, direction: 'in', icon: '💼' });
  }
  if (passiveOnly > 0) {
    entries.push({ id: 'passive', label: 'Passive', amount: passiveOnly, direction: 'in', icon: '🌙' });
  }
  if (offlinePortion > 0) {
    entries.push({ id: 'offline', label: 'Offline', amount: offlinePortion, direction: 'in', icon: '🛰️' });
  }

  const upkeep = toCurrency(summary.upkeepSpend);
  if (upkeep > 0) {
    entries.push({ id: 'upkeep', label: 'Upkeep', amount: upkeep, direction: 'out', icon: '⚙️' });
  }

  const tuitionSpend = ensureArray(summary.spendBreakdown)
    .filter(entry => typeof entry?.key === 'string' && entry.key.includes(':tuition'))
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  if (tuitionSpend > 0) {
    entries.push({ id: 'tuition', label: 'Tuition', amount: tuitionSpend, direction: 'out', icon: '🎓' });
  }

  const otherSpend = Math.max(0, toCurrency(summary.totalSpend) - upkeep - tuitionSpend);
  if (otherSpend > 0) {
    entries.push({ id: 'investments', label: 'Invest', amount: otherSpend, direction: 'out', icon: '🚀' });
  }

  return entries;
}

function formatSourceNote(source) {
  if (!source || typeof source !== 'object') return '';
  const count = Number(source.count);
  const name = source.name || source.label || '';
  if (!Number.isFinite(count) || count <= 0 || !name) return name || '';
  return `${count} ${name}${count === 1 ? '' : 's'}`;
}

function buildInflowLedger(summary = {}) {
  const groups = new Map();

  function pushEntry(groupId, groupLabel, icon, entry) {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label: groupLabel,
        icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(groupId);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Income',
      amount,
      note: formatSourceNote(entry?.source) || ''
    });
  }

  ensureArray(summary.earningsBreakdown).forEach(entry => {
    pushEntry('active', 'Active Hustles', '💼', entry);
  });

  ensureArray(summary.passiveBreakdown).forEach(entry => {
    const stream = entry?.stream === 'offline' ? 'offline' : 'passive';
    const label = stream === 'offline' ? 'Offline Windfalls' : 'Passive Streams';
    const icon = stream === 'offline' ? '🛰️' : '🌙';
    pushEntry(stream, label, icon, entry);
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

const SPEND_CATEGORY_META = {
  maintenance: { id: 'maintenance', label: 'Upkeep', icon: '⚙️' },
  payroll: { id: 'payroll', label: 'Payroll', icon: '🤖' },
  investment: { id: 'investment', label: 'Investments', icon: '🚀' },
  setup: { id: 'setup', label: 'Setup', icon: '🛠️' },
  upgrade: { id: 'upgrade', label: 'Upgrades', icon: '⬆️' },
  consumable: { id: 'consumable', label: 'Boosts', icon: '☕' },
  tuition: { id: 'tuition', label: 'Tuition', icon: '🎓' }
};

function resolveSpendCategory(entry = {}) {
  if (typeof entry?.key === 'string' && entry.key.includes(':tuition')) {
    return SPEND_CATEGORY_META.tuition;
  }
  const category = String(entry?.category || '').split(':')[0];
  if (SPEND_CATEGORY_META[category]) {
    return SPEND_CATEGORY_META[category];
  }
  return { id: 'other', label: 'Other', icon: '📉' };
}

function buildOutflowLedger(summary = {}) {
  const groups = new Map();

  ensureArray(summary.spendBreakdown).forEach(entry => {
    const meta = resolveSpendCategory(entry);
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(meta.id)) {
      groups.set(meta.id, {
        id: meta.id,
        label: meta.label,
        icon: meta.icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(meta.id);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Spending',
      amount,
      note: entry?.definition?.category || entry?.category || ''
    });
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

function computeTopEarner(summary = {}) {
  const pools = [
    ...ensureArray(summary.earningsBreakdown),
    ...ensureArray(summary.passiveBreakdown)
  ];
  let top = null;
  pools.forEach(entry => {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!top || amount > top.amount) {
      top = {
        label: entry?.label || entry?.definition?.label || 'Top earner',
        amount,
        stream: entry?.stream || entry?.category || 'income'
      };
    }
  });
  return top;
}

function collectUnfundedUpkeep(assetDefinitions = [], state) {
  let total = 0;
  let count = 0;
  const entries = [];

  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active' || instance.maintenanceFundedToday) return;
      const cost = Math.max(0, Number(definition.maintenance?.cost) || 0);
      if (cost <= 0) return;
      total += cost;
      count += 1;
      entries.push({
        id: instance.id,
        label: instanceLabel(definition, index),
        amount: toCurrency(cost)
      });
    });
  });

  return { total: toCurrency(total), count, entries };
}

function collectTuitionCommitments(educationDefinitions = [], state) {
  const entries = [];

  educationDefinitions.forEach(definition => {
    const track = resolveTrack(definition);
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled || progress.completed) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewards(track.id);
    const skillNames = ensureArray(rewards.skills).map(skill => skill.name).filter(Boolean);
    const bonusParts = [];
    if (rewards.xp > 0) {
      bonusParts.push(`${rewards.xp} XP`);
    }
    if (skillNames.length) {
      bonusParts.push(`Boosts: ${skillNames.join(', ')}`);
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

  const total = entries.reduce((sum, entry) => sum + entry.tuition, 0);
  return { total: toCurrency(total), entries };
}

function buildObligations(state, assetDefinitions = [], educationDefinitions = [], helpers = {}) {
  const upkeep = collectUnfundedUpkeep(assetDefinitions, state);
  const assistantCountFn = helpers.getAssistantCount || getAssistantCount;
  const assistantDailyCostFn = helpers.getAssistantDailyCost || getAssistantDailyCost;
  const assistants = Math.max(0, Number(assistantCountFn(state)) || 0);
  const payroll = toCurrency(assistantDailyCostFn(state));
  const tuition = collectTuitionCommitments(educationDefinitions, state);

  const entries = [];
  entries.push({
    id: 'upkeep',
    label: 'Unfunded upkeep',
    amount: upkeep.total,
    note: upkeep.count > 0 ? `${upkeep.count} asset${upkeep.count === 1 ? '' : 's'} waiting` : 'All assets covered',
    items: upkeep.entries
  });
  entries.push({
    id: 'payroll',
    label: 'Assistant payroll',
    amount: payroll,
    note: assistants > 0 ? `${assistants} assistant${assistants === 1 ? '' : 's'} on staff` : 'No assistants hired'
  });
  entries.push({
    id: 'tuition',
    label: 'Study commitments',
    amount: tuition.total,
    note: tuition.entries.length
      ? `${tuition.entries.length} active course${tuition.entries.length === 1 ? '' : 's'}`
      : 'No tuition in progress',
    items: tuition.entries
  });

  const actionable = entries.filter(entry => entry.amount > 0);
  const quick = actionable.length
    ? actionable.sort((a, b) => b.amount - a.amount)[0]
    : { id: 'clear', label: 'All obligations covered', amount: 0, note: 'Nothing urgent' };

  return { entries, quick };
}

function buildPendingIncome(assetDefinitions = [], state) {
  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
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
        label: instanceLabel(definition, index),
        assetName: definition.singular || definition.name || definition.id,
        amount: pending,
        breakdown: breakdownEntries
      });
    });
  });
  return entries.sort((a, b) => b.amount - a.amount);
}

function buildAssetPerformance(assetDefinitions = [], state) {
  const currentDay = Math.max(1, Number(state?.day) || 1);
  const entries = [];
  assetDefinitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      if (!instance || instance.status !== 'active') return;
      const created = Math.max(1, Number(instance.createdOnDay) || currentDay);
      const daysActive = Math.max(1, currentDay - created + 1);
      const average = toCurrency(instance.totalIncome / daysActive);
      const latest = toCurrency(instance.lastIncome);
      const upkeep = toCurrency(Number(definition.maintenance?.cost) || 0);
      const saleValue = toCurrency(calculateAssetSalePrice(instance));
      entries.push({
        id: instance.id,
        assetId: definition.id,
        label: instanceLabel(definition, index),
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

function buildAssetOpportunities(assetDefinitions = [], state) {
  return assetDefinitions
    .map(definition => {
      const availability = describeAssetLaunchAvailability(definition, state);
      const setupDays = Number(definition.setup?.days) || 0;
      const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
      const totalHours = toCurrency(setupDays * hoursPerDay);
      const payoutRange = getDailyIncomeRange(definition);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(definition.setup?.cost || 0),
        ready: !availability.disabled,
        reasons: availability.reasons || [],
        setup: {
          days: setupDays,
          hoursPerDay,
          totalHours
        },
        payoutRange: {
          min: toCurrency(payoutRange?.min),
          max: toCurrency(payoutRange?.max)
        }
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

function buildUpgradeOpportunities(upgradeDefinitions = [], state) {
  return upgradeDefinitions
    .map(definition => {
      const snapshot = getUpgradeSnapshot(definition, state);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(snapshot.cost),
        ready: snapshot.ready,
        purchased: snapshot.purchased,
        affordable: snapshot.affordable,
        description: definition.description || ''
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

function buildHustleOpportunities(hustleDefinitions = [], state) {
  return hustleDefinitions
    .map(definition => {
      const time = Number(definition.time || definition.action?.timeCost) || 0;
      const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
      const roi = time > 0 ? payout / time : payout;
      const requirements = (describeHustleRequirements?.(definition, state) || []).map(req => ({
        label: req.label,
        met: req.met
      }));
      return {
        id: definition.id,
        name: definition.name || definition.id,
        time,
        payout,
        roi,
        requirements
      };
    })
    .sort((a, b) => b.roi - a.roi);
}

function buildOpportunitySummary(assets, upgrades, hustles) {
  return {
    assets,
    upgrades,
    hustles
  };
}

function buildEducationInvestmentsForBank(educationDefinitions = [], state) {
  const entries = [];
  educationDefinitions.forEach(definition => {
    const track = resolveTrack(definition);
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled) return;
    const remainingDays = Math.max(0, Number(progress.totalDays ?? track.days) - Number(progress.daysCompleted || 0));
    const rewards = buildSkillRewards(track.id);
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

export function buildFinanceModel(registries = {}, helpers = {}) {
  const { getState: getStateFn = getState } = helpers;
  const state = getStateFn();
  if (!state) {
    return {
      header: null,
      ledger: { inflows: [], outflows: [] },
      obligations: { entries: [], quick: null },
      pendingIncome: [],
      assetPerformance: [],
      opportunities: buildOpportunitySummary([], [], []),
      education: [],
      summary: null,
      history: [],
      activity: []
    };
  }

  const summary = computeDailySummary(state);
  const assetDefinitions = Array.isArray(registries?.assets) ? registries.assets : getAssets();
  const upgradeDefinitions = Array.isArray(registries?.upgrades) ? registries.upgrades : getUpgrades();
  const hustleDefinitions = Array.isArray(registries?.hustles) ? registries.hustles : getHustles();
  const educationDefinitions = Array.isArray(registries?.education) ? registries.education : [];

  const inflows = buildInflowLedger(summary);
  const outflows = buildOutflowLedger(summary);
  const obligations = buildObligations(state, assetDefinitions, educationDefinitions, helpers);
  const pendingIncome = buildPendingIncome(assetDefinitions, state);
  const assetPerformance = buildAssetPerformance(assetDefinitions, state);
  const opportunities = buildOpportunitySummary(
    buildAssetOpportunities(assetDefinitions, state),
    buildUpgradeOpportunities(upgradeDefinitions, state),
    buildHustleOpportunities(hustleDefinitions, state)
  );
  const educationInvestments = buildEducationInvestmentsForBank(educationDefinitions, state);
  const pulse = buildPulseSummary(summary);
  const topEarner = computeTopEarner(summary);

  const currentBalance = toCurrency(state.money);
  const dailyIncome = toCurrency(summary.totalEarnings);
  const dailySpend = toCurrency(summary.totalSpend);
  const netDaily = toCurrency(summary.totalEarnings - summary.totalSpend);

  const header = {
    currentBalance,
    netDaily,
    dailyIncome,
    dailySpend,
    lifetimeEarned: toCurrency(state.totals?.earned),
    lifetimeSpent: toCurrency(state.totals?.spent),
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
    history: buildCashHistory(state),
    activity: buildActivityFeed(state)
  };
}

export default buildFinanceModel;
