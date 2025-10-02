import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber, buildSummaryPresentations } from './formatters.js';
import { getAssetState } from '../../core/state.js';
import { getAssets } from '../../game/registryService.js';
import { computeStudyProgress } from './knowledge.js';

function computeTimeCap(state = {}) {
  const base = clampNumber(state.baseTime);
  const bonus = clampNumber(state.bonusTime);
  const daily = clampNumber(state.dailyBonusTime);
  return Math.max(0, base + bonus + daily);
}

function describeQueue(summary = {}) {
  const { timeEntries } = buildSummaryPresentations(summary);
  const entries = Array.isArray(timeEntries) ? timeEntries : [];
  if (!entries.length) {
    return [
      {
        id: 'queue:empty',
        label: 'Nothing queued yet',
        detail: 'Open hustles to schedule your next move.',
        hours: 0,
        state: 'idle'
      }
    ];
  }

  return entries.slice(0, 6).map(entry => ({
    id: entry.key || entry.label || 'queue:item',
    label: entry.label,
    detail: entry.value,
    hours: clampNumber(entry.hours),
    state: entry.category === 'maintenance' ? 'maintenance' : 'active'
  }));
}

function buildQueueModel(summary = {}) {
  const items = describeQueue(summary).map(entry => ({
    ...entry,
    hoursLabel: formatHours(entry.hours)
  }));
  return { items };
}

function computeAssetMetrics(state = {}) {
  let activeAssets = 0;
  let upkeepDue = 0;

  for (const asset of getAssets()) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (instance?.status === 'active') {
        activeAssets += 1;
        if (!instance.maintenanceFundedToday) {
          upkeepDue += clampNumber(asset.maintenance?.cost);
        }
      }
    });
  }

  return { activeAssets, upkeepDue };
}

function buildDailyStats(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const totalTime = Math.max(0, clampNumber(summary.totalTime));
  const setupHours = Math.max(0, clampNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, clampNumber(summary.maintenanceHours));
  const otherTimeHours = Math.max(0, clampNumber(summary.otherTimeHours));
  const timeSummaryText = totalTime > 0
    ? `${formatHours(totalTime)} invested • ${formatHours(setupHours)} setup • ${formatHours(maintenanceHours)} upkeep • ${formatHours(otherTimeHours)} flex`
    : 'No hours logged yet. Queue a hustle to get moving.';

  const totalEarnings = Math.max(0, clampNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, clampNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, clampNumber(summary.passiveEarnings));
  const earningsSummaryText = totalEarnings > 0
    ? `$${formatMoney(totalEarnings)} earned • $${formatMoney(activeEarnings)} active • $${formatMoney(passiveEarnings)} passive`
    : 'Payouts will appear once you start closing deals.';

  const totalSpend = Math.max(0, clampNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, clampNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, clampNumber(summary.investmentSpend));
  const spendSummaryText = totalSpend > 0
    ? `$${formatMoney(totalSpend)} spent • $${formatMoney(upkeepSpend)} upkeep • $${formatMoney(investmentSpend)} investments`
    : 'Outflows land here when upkeep and investments fire.';

  const knowledgeInProgress = Math.max(0, clampNumber(summary.knowledgeInProgress));
  const knowledgePending = Math.max(0, clampNumber(summary.knowledgePendingToday));
  const studySummaryText = knowledgeInProgress > 0
    ? `${knowledgeInProgress} track${knowledgeInProgress === 1 ? '' : 's'} in flight • ${knowledgePending > 0 ? `${knowledgePending} session${knowledgePending === 1 ? '' : 's'} waiting today` : 'All sessions logged today'}`
    : 'Enroll in a track to kickstart your learning streak.';

  return {
    time: {
      summary: timeSummaryText,
      entries: presentations.timeEntries,
      emptyMessage: 'Time tracking kicks off after your first action.',
      limit: 3
    },
    earnings: {
      summary: earningsSummaryText,
      active: {
        entries: presentations.earningsEntries,
        emptyMessage: 'Active gigs will report here.',
        limit: 3
      },
      passive: {
        entries: presentations.passiveEntries,
        emptyMessage: 'Passive and offline streams update after upkeep.',
        limit: 3
      }
    },
    spend: {
      summary: spendSummaryText,
      entries: presentations.spendEntries,
      emptyMessage: 'No cash out yet. Fund upkeep or buy an upgrade.',
      limit: 3
    },
    study: {
      summary: studySummaryText,
      entries: presentations.studyEntries,
      emptyMessage: 'Your courses will list here once enrolled.',
      limit: 3
    }
  };
}

function buildHeaderMetrics(state = {}, summary = {}) {
  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const timeCap = computeTimeCap(state);
  const dailyEarnings = Math.max(0, clampNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, clampNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, clampNumber(summary.passiveEarnings));
  const dailySpend = Math.max(0, clampNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, clampNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, clampNumber(summary.investmentSpend));
  const reservedHours = Math.max(0, timeCap - hoursLeft);
  const setupHours = Math.max(0, clampNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, clampNumber(summary.maintenanceHours));
  const flexHours = Math.max(0, reservedHours - setupHours - maintenanceHours);

  const incomeSegments = [];
  if (activeEarnings > 0) {
    incomeSegments.push(`$${formatMoney(activeEarnings)} active`);
  }
  if (passiveEarnings > 0) {
    incomeSegments.push(`$${formatMoney(passiveEarnings)} passive`);
  }

  const spendSegments = [];
  if (upkeepSpend > 0) {
    spendSegments.push(`$${formatMoney(upkeepSpend)} upkeep`);
  }
  if (investmentSpend > 0) {
    spendSegments.push(`$${formatMoney(investmentSpend)} invest`);
  }
  const dailyNet = dailyEarnings - dailySpend;
  if (dailyNet !== 0) {
    const netLabel = `${dailyNet >= 0 ? 'Net +' : 'Net -'}$${formatMoney(Math.abs(dailyNet))}`;
    spendSegments.push(netLabel);
  }

  const reservedSegments = [];
  if (setupHours > 0) {
    reservedSegments.push(`${formatHours(setupHours)} setup`);
  }
  if (maintenanceHours > 0) {
    reservedSegments.push(`${formatHours(maintenanceHours)} upkeep`);
  }
  if (flexHours > 0) {
    reservedSegments.push(`${formatHours(flexHours)} hustle`);
  }

  return {
    dailyPlus: {
      value: `$${formatMoney(dailyEarnings)}`,
      note: incomeSegments.length ? incomeSegments.join(' • ') : 'Waiting on payouts'
    },
    dailyMinus: {
      value: `$${formatMoney(dailySpend)}`,
      note: spendSegments.length ? spendSegments.join(' • ') : 'No cash out yet'
    },
    timeAvailable: {
      value: formatHours(hoursLeft),
      note: `Cap ${formatHours(timeCap)}`
    },
    timeReserved: {
      value: formatHours(reservedHours),
      note: reservedSegments.length ? reservedSegments.join(' • ') : 'Queue is wide open'
    }
  };
}

function buildKpiStats(state = {}, summary = {}) {
  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const net = clampNumber(summary.totalEarnings) - clampNumber(summary.totalSpend);
  const { activeAssets, upkeepDue } = computeAssetMetrics(state);
  const { percent, summary: studySummary } = computeStudyProgress(state);

  return {
    net: {
      value: `$${formatMoney(net)}`,
      note: `${formatMoney(clampNumber(summary.totalEarnings))} earned • ${formatMoney(clampNumber(summary.totalSpend))} spent`
    },
    hours: {
      value: `${formatHours(hoursLeft)}`,
      note: hoursLeft > 0 ? 'Plenty of hustle hours left.' : 'Day is tapped out.'
    },
    upkeep: {
      value: `$${formatMoney(upkeepDue)}`,
      note: upkeepDue > 0 ? 'Maintain ventures soon.' : 'Upkeep funded.'
    },
    ventures: {
      value: String(activeAssets),
      note: activeAssets > 0 ? 'Streams humming.' : 'Launch your first venture.'
    },
    study: {
      value: `${percent}%`,
      note: studySummary
    }
  };
}

export function buildDailySummaries(state = {}, summary = {}) {
  return {
    headerMetrics: buildHeaderMetrics(state, summary),
    kpis: buildKpiStats(state, summary),
    queue: buildQueueModel(summary),
    dailyStats: buildDailyStats(summary)
  };
}

export default {
  buildDailySummaries
};
