import elements from './elements.js';
import { endDay } from '../game/lifecycle.js';
import { buildAssetUpgradeRecommendations, buildQuickActions } from './dashboard.js';
import { formatHours } from '../core/helpers.js';

let activeRecommendation = null;

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

function selectRecommendation(state) {
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

function applyButtonState(button, recommendation) {
  if (!button) return;

  if (!recommendation) {
    activeRecommendation = null;
    button.textContent = 'End Day';
    button.dataset.actionMode = 'end';
    delete button.dataset.actionId;
    button.title = 'Wrap today when you are ready to reset the grind.';
    button.classList.remove('is-recommendation');
    return;
  }

  activeRecommendation = recommendation;
  button.textContent = recommendation.buttonText || 'Next action';
  button.dataset.actionMode = recommendation.mode;
  button.dataset.actionId = recommendation.id || '';
  if (recommendation.description) {
    button.title = recommendation.description;
  } else {
    button.removeAttribute('title');
  }
  button.classList.add('is-recommendation');
}

export function initHeaderActionControls() {
  const button = elements.endDayButton;
  if (!button) return;

  button.addEventListener('click', () => {
    if (activeRecommendation?.onClick) {
      activeRecommendation.onClick();
      return;
    }
    endDay(false);
  });
}

export function updateHeaderAction(state) {
  const button = elements.endDayButton;
  if (!button) return;

  const recommendation = selectRecommendation(state);
  applyButtonState(button, recommendation);
}
