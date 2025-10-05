import { buildAssetUpgradeRecommendations, buildQuickActions } from '../dashboard/quickActions.js';
import { formatHours } from '../../core/helpers.js';
import { collectActionProviders } from '../actions/providers.js';

function formatActionLabel(base, timeCost) {
  if (!base) return '';
  const trimmed = base.trim();
  if (!timeCost || timeCost <= 0) {
    return `Next: ${trimmed}`;
  }
  return `Next: ${trimmed} • ${formatHours(timeCost)}`;
}

function normalizeAssetRecommendation(entry) {
  if (!entry) return null;
  const source = entry.raw || entry;
  const label = source.buttonLabel || source.primaryLabel || source.title || entry.title;
  const timeCost = Number.isFinite(source.timeCost)
    ? source.timeCost
    : Number.isFinite(entry.timeCost)
      ? entry.timeCost
      : entry.durationHours || 0;
  const description = source.subtitle || source.description || source.meta || entry.meta || entry.title;
  return {
    id: entry.id,
    mode: 'asset',
    buttonText: formatActionLabel(label, timeCost),
    description,
    onClick: entry.onClick,
    timeCost
  };
}

function normalizeQuickAction(entry) {
  if (!entry) return null;
  const source = entry.raw || entry;
  const primary = source.primaryLabel || source.buttonLabel || 'Queue';
  const label = source.label || source.title || entry.title || '';
  const fullLabel = `${primary} ${label}`.trim();
  const timeCost = Number.isFinite(source.timeCost)
    ? source.timeCost
    : Number.isFinite(entry.timeCost)
      ? entry.timeCost
      : entry.durationHours || 0;
  return {
    id: entry.id,
    mode: 'hustle',
    buttonText: formatActionLabel(fullLabel, timeCost),
    description: source.description || source.subtitle || entry.description || '',
    onClick: entry.onClick,
    timeCost
  };
}

function selectHeaderAction(state) {
  const providerSnapshots = collectActionProviders({ state }) || [];
  const assetSnapshots = providerSnapshots
    .filter(snapshot => snapshot.id === 'asset-upgrades' || snapshot.focusCategory === 'upgrade');
  const quickSnapshots = providerSnapshots
    .filter(snapshot => snapshot.id === 'quick-actions' || snapshot.focusCategory === 'hustle');

  const assetEntries = assetSnapshots.flatMap(snapshot => snapshot.entries || []);
  const quickEntries = quickSnapshots.flatMap(snapshot => snapshot.entries || []);

  const normalizedAssetEntries = assetSnapshots.length
    ? assetEntries
    : buildAssetUpgradeRecommendations(state).map(entry => ({
        ...entry,
        raw: entry,
        durationHours: entry.timeCost,
        timeCost: entry.timeCost
      }));

  const assetActions = normalizedAssetEntries
    .map(normalizeAssetRecommendation)
    .filter(Boolean)
    .sort((a, b) => (b.timeCost || 0) - (a.timeCost || 0));
  if (assetActions.length) {
    return assetActions[0];
  }

  const normalizedQuickEntries = quickSnapshots.length
    ? quickEntries
    : buildQuickActions(state).map(entry => ({
        ...entry,
        raw: entry,
        durationHours: entry.durationHours,
        timeCost: entry.durationHours
      }));

  const quickActions = normalizedQuickEntries
    .map(normalizeQuickAction)
    .filter(Boolean)
    .sort((a, b) => (b.timeCost || 0) - (a.timeCost || 0));
  return quickActions[0] || null;
}

export function buildHeaderActionModel(state) {
  const recommendation = selectHeaderAction(state);
  if (!recommendation) {
    return {
      recommendation: null,
      button: {
        text: 'End Day',
        mode: 'end',
        actionId: '',
        title: 'Wrap today when you are ready to reset the grind.',
        isRecommendation: false
      }
    };
  }

  return {
    recommendation,
    button: {
      text: recommendation.buttonText || 'Next action',
      mode: recommendation.mode || 'end',
      actionId: recommendation.id || '',
      title: recommendation.description || '',
      isRecommendation: true
    }
  };
}

