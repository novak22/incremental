import { buildAssetUpgradeRecommendations, buildQuickActions } from '../dashboard/quickActions.js';
import { formatHours } from '../../core/helpers.js';

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
  const label = entry.buttonLabel || entry.title;
  return {
    id: entry.id,
    mode: 'asset',
    buttonText: formatActionLabel(label || entry.title, entry.timeCost),
    description: entry.subtitle || entry.meta || entry.title,
    onClick: entry.onClick,
    timeCost: entry.timeCost || 0
  };
}

function normalizeQuickAction(entry) {
  if (!entry) return null;
  const primary = entry.primaryLabel || 'Queue';
  const fullLabel = `${primary} ${entry.label}`.trim();
  return {
    id: entry.id,
    mode: 'hustle',
    buttonText: formatActionLabel(fullLabel, entry.timeCost),
    description: entry.description,
    onClick: entry.onClick,
    timeCost: entry.timeCost || 0
  };
}

function selectHeaderAction(state) {
  const assetActions = buildAssetUpgradeRecommendations(state)
    .map(normalizeAssetRecommendation)
    .filter(Boolean)
    .sort((a, b) => (b.timeCost || 0) - (a.timeCost || 0));
  if (assetActions.length) {
    return assetActions[0];
  }

  const quickActions = buildQuickActions(state)
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

