import elements from './elements.js';
import { endDay } from '../game/lifecycle.js';
import { buildAssetUpgradeRecommendations, buildQuickActions } from './dashboard.js';
import { formatHours } from '../core/helpers.js';

let activeRecommendation = null;
const autoForwardState = {
  enabled: false,
  timerId: null
};

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

function applyAutoForwardState(enabled) {
  if (autoForwardState.timerId) {
    clearInterval(autoForwardState.timerId);
    autoForwardState.timerId = null;
  }

  const primaryButton = elements.endDayButton;
  const toggle = elements.autoForwardButton;
  autoForwardState.enabled = Boolean(enabled && primaryButton && toggle);

  if (toggle) {
    toggle.classList.toggle('is-active', autoForwardState.enabled);
    toggle.setAttribute('aria-pressed', String(autoForwardState.enabled));
    toggle.textContent = autoForwardState.enabled ? 'Auto Forward: On' : 'Auto Forward';
    toggle.title = autoForwardState.enabled
      ? 'Auto forward is live and will trigger the next action every 2 seconds.'
      : 'Toggle auto forward to trigger the next action every 2 seconds.';
  }

  if (!autoForwardState.enabled) {
    return;
  }

  autoForwardState.timerId = setInterval(() => {
    const target = elements.endDayButton;
    if (!target) {
      applyAutoForwardState(false);
      return;
    }
    if (target.disabled) {
      return;
    }
    target.click();
  }, 2000);
}

export function initHeaderActionControls() {
  const button = elements.endDayButton;
  if (button) {
    button.addEventListener('click', () => {
      if (activeRecommendation?.onClick) {
        activeRecommendation.onClick();
        return;
      }
      endDay(false);
    });
  }

  const toggle = elements.autoForwardButton;
  if (toggle) {
    toggle.addEventListener('click', () => {
      applyAutoForwardState(!autoForwardState.enabled);
    });
    toggle.title = 'Toggle auto forward to trigger the next action every 2 seconds.';
  }

  applyAutoForwardState(false);
}

export function updateHeaderAction(state) {
  const button = elements.endDayButton;
  if (!button) return;

  const recommendation = selectRecommendation(state);
  applyButtonState(button, recommendation);
}
