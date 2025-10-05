import { formatHours } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import {
  buildQuickActionModel,
  buildAssetActionModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations
} from './quickActions.js';
import { buildStudyEnrollmentActionModel } from './knowledge.js';

export function selectProvider(providerSnapshots, id, focusCategory) {
  if (!Array.isArray(providerSnapshots) || providerSnapshots.length === 0) {
    return null;
  }

  return providerSnapshots.find(snapshot => snapshot.id === id)
    || providerSnapshots.find(snapshot => snapshot.focusCategory === focusCategory)
    || null;
}

export function buildQuickActionsFromProvider(state, provider) {
  if (!provider) {
    return buildQuickActionModel(state);
  }

  const metrics = provider.metrics || {};
  const entries = (provider.entries || []).map(entry => {
    const source = entry.raw || {};
    const title = source.title || entry.title;
    const subtitle = source.subtitle || source.description || '';
    const buttonLabel = source.buttonLabel || source.primaryLabel || metrics.defaultLabel || 'Queue';
    const durationHours = Number.isFinite(entry.timeCost)
      ? entry.timeCost
      : Number.isFinite(source.timeCost)
        ? source.timeCost
        : entry.durationHours;
    const payout = Number.isFinite(source.payout)
      ? source.payout
      : entry.payout;
    const payoutText = source.payoutText || entry.payoutText || entry.meta || '';
    const meta = source.meta || entry.meta || payoutText;
    return {
      id: entry.id,
      title,
      subtitle,
      buttonLabel,
      onClick: entry.onClick,
      payout,
      payoutText,
      durationHours,
      durationText: source.durationText || entry.durationText,
      meta,
      repeatable: source.repeatable ?? entry.repeatable,
      remainingRuns: source.remainingRuns ?? entry.remainingRuns
    };
  });

  const inProgress = Array.isArray(metrics.inProgressEntries)
    ? metrics.inProgressEntries.map(entry => ({
        id: entry?.id,
        title: entry?.title,
        subtitle: entry?.subtitle || '',
        meta: entry?.meta || '',
        payoutText: entry?.payoutText || '',
        payout: entry?.payout,
        remainingDays: entry?.remainingDays ?? null,
        deadlineDay: entry?.deadlineDay ?? null,
        hoursRemaining: entry?.hoursRemaining ?? null,
        hoursLogged: entry?.hoursLogged ?? null,
        hoursRequired: entry?.hoursRequired ?? null,
        progress: entry?.progress || null
      }))
    : [];

  const baseHours = clampNumber(state?.baseTime)
    + clampNumber(state?.bonusTime)
    + clampNumber(state?.dailyBonusTime);
  const hoursAvailable = metrics.hoursAvailable != null
    ? Math.max(0, clampNumber(metrics.hoursAvailable))
    : Math.max(0, clampNumber(state?.timeLeft));
  const hoursSpent = metrics.hoursSpent != null
    ? Math.max(0, clampNumber(metrics.hoursSpent))
    : Math.max(0, baseHours - hoursAvailable);

  const scroller = metrics.scroller;
  const model = {
    entries,
    emptyMessage: metrics.emptyMessage || 'No ready actions. Check upgrades or ventures.',
    buttonClass: metrics.buttonClass || 'primary',
    defaultLabel: metrics.defaultLabel || 'Queue',
    hoursAvailable,
    hoursAvailableLabel: metrics.hoursAvailableLabel || formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: metrics.hoursSpentLabel || formatHours(hoursSpent),
    day: clampNumber(state?.day),
    moneyAvailable: metrics.moneyAvailable != null
      ? clampNumber(metrics.moneyAvailable)
      : clampNumber(state?.money),
    inProgress
  };

  if (scroller) {
    model.scroller = scroller;
  }

  return model;
}

export function buildAssetActionsFromProvider(state, provider) {
  if (!provider) {
    return buildAssetActionModel(state);
  }

  const metrics = provider.metrics || {};
  const entries = (provider.entries || []).map(entry => {
    const source = entry.raw || {};
    const title = source.title || entry.title;
    const subtitle = source.subtitle || source.description || '';
    const meta = source.meta || entry.meta || '';
    const metaClass = source.metaClass || '';
    const timeCost = Number.isFinite(source.timeCost)
      ? source.timeCost
      : Number.isFinite(entry.timeCost)
        ? entry.timeCost
        : entry.durationHours;
    const moneyCost = Number.isFinite(source.moneyCost)
      ? source.moneyCost
      : entry.moneyCost;
    return {
      id: entry.id,
      title,
      subtitle,
      meta,
      metaClass,
      buttonLabel: source.buttonLabel || metrics.defaultLabel || 'Boost',
      onClick: entry.onClick,
      timeCost: Number.isFinite(timeCost) ? timeCost : 0,
      durationHours: Number.isFinite(timeCost) ? timeCost : 0,
      durationText: source.durationText || entry.durationText,
      moneyCost,
      repeatable: source.repeatable ?? entry.repeatable,
      remainingRuns: source.remainingRuns ?? entry.remainingRuns
    };
  });

  return {
    entries,
    emptyMessage: metrics.emptyMessage
      || 'Every venture is humming along. Check back after today’s upkeep.',
    buttonClass: metrics.buttonClass || 'secondary',
    defaultLabel: metrics.defaultLabel || 'Boost',
    scroller: metrics.scroller || { limit: 6 },
    moneyAvailable: metrics.moneyAvailable != null
      ? clampNumber(metrics.moneyAvailable)
      : clampNumber(state?.money)
  };
}

export function buildStudyActionsFromProvider(state, provider) {
  if (!provider) {
    return buildStudyEnrollmentActionModel(state);
  }

  const metrics = provider.metrics || {};
  const entries = (provider.entries || []).map(entry => {
    const source = entry.raw || {};
    const title = source.title || entry.title;
    const subtitle = source.subtitle || source.description || '';
    const meta = source.meta || entry.meta || '';
    const timeCost = Number.isFinite(source.timeCost)
      ? source.timeCost
      : Number.isFinite(entry.timeCost)
        ? entry.timeCost
        : entry.durationHours;
    const moneyCost = Number.isFinite(source.moneyCost)
      ? source.moneyCost
      : entry.moneyCost;
    return {
      id: entry.id,
      title,
      subtitle,
      meta,
      buttonLabel: source.buttonLabel || metrics.defaultLabel || 'Enroll',
      onClick: entry.onClick,
      timeCost: Number.isFinite(timeCost) ? timeCost : 0,
      durationHours: Number.isFinite(timeCost) ? timeCost : 0,
      durationText: source.durationText || entry.durationText,
      moneyCost,
      repeatable: source.repeatable ?? entry.repeatable,
      remainingRuns: source.remainingRuns ?? entry.remainingRuns
    };
  });

  const baseHours = clampNumber(state?.baseTime)
    + clampNumber(state?.bonusTime)
    + clampNumber(state?.dailyBonusTime);
  const hoursAvailable = metrics.hoursAvailable != null
    ? Math.max(0, clampNumber(metrics.hoursAvailable))
    : Math.max(0, clampNumber(state?.timeLeft));
  const hoursSpent = metrics.hoursSpent != null
    ? Math.max(0, clampNumber(metrics.hoursSpent))
    : Math.max(0, baseHours - hoursAvailable);

  return {
    entries,
    emptyMessage: metrics.emptyMessage || 'No study tracks are ready to enroll right now.',
    moneyAvailable: metrics.moneyAvailable != null
      ? clampNumber(metrics.moneyAvailable)
      : clampNumber(state?.money),
    hoursAvailable,
    hoursAvailableLabel: metrics.hoursAvailableLabel || formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: metrics.hoursSpentLabel || formatHours(hoursSpent)
  };
}

export function buildDashboardActionModels(state, providerSnapshots = []) {
  const quickProvider = selectProvider(providerSnapshots, 'quick-actions', 'hustle');
  const assetProvider = selectProvider(providerSnapshots, 'asset-upgrades', 'upgrade');
  const studyProvider = selectProvider(providerSnapshots, 'study-enrollment', 'study');

  return {
    quickActions: buildQuickActionsFromProvider(state, quickProvider),
    assetActions: buildAssetActionsFromProvider(state, assetProvider),
    studyActions: buildStudyActionsFromProvider(state, studyProvider)
  };
}

export {
  buildQuickActionModel,
  buildAssetActionModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
};

export default buildDashboardActionModels;

