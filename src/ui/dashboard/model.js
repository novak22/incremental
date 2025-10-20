import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { buildDailySummaries } from './passiveIncome.js';
import {
  buildDashboardActionModels,
  buildQuickActionModel,
  buildAssetActionModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
} from './actionProviders.js';
import { buildNicheViewModel } from './nicheModel.js';
import {
  buildNotificationModel,
  buildEventLogModel
} from './notificationsModel.js';
import { collectActionProviders } from '../actions/providers.js';

export function buildDashboardViewModel(state, summary = {}) {
  if (!state) return null;

  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const session = {
    statusText: `Day ${state.day || 0} • ${formatHours(hoursLeft)} remaining`,
    moneyText: `$${formatMoney(clampNumber(state.money))}`
  };

  const daily = buildDailySummaries(state, summary);
  const providerSnapshots = collectActionProviders({ state, summary }) || [];
  const actions = buildDashboardActionModels(state, providerSnapshots);

  return {
    session,
    headerMetrics: daily.headerMetrics,
    kpis: daily.kpis,
    queue: daily.queue,
    quickActions: actions.quickActions,
    assetActions: actions.assetActions,
    studyActions: actions.studyActions,
    notifications: buildNotificationModel(state),
    eventLog: buildEventLogModel(state),
    dailyStats: daily.dailyStats,
    niche: buildNicheViewModel(state)
  };
}

export {
  buildQuickActionModel,
  buildAssetActionModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
};

