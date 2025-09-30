import elements from './elements.js';
import { endDay } from '../game/lifecycle.js';
import { buildAssetUpgradeRecommendations, buildQuickActions } from './dashboard.js';
import { formatHours } from '../core/helpers.js';

let activeRecommendation = null;
const AUTO_FORWARD_MODES = ['paused', 'current', 'double'];
const AUTO_FORWARD_INTERVALS = {
  paused: null,
  current: 2000,
  double: 1000
};
const AUTO_FORWARD_ICONS = {
  paused: '⏸',
  current: '▶',
  double: '⏩'
};
const AUTO_FORWARD_LABELS = {
  paused: 'Auto Forward: Paused',
  current: 'Auto Forward: Current speed',
  double: 'Auto Forward: Double speed'
};
const AUTO_FORWARD_TITLES = {
  paused: 'Tap to let auto forward queue the next action for you.',
  current: 'Auto forward is cruising and taps the next action every 2 seconds.',
  double: 'Auto forward is in turbo mode and taps the next action twice as fast (every 1 second).'
};

const autoForwardState = {
  mode: 'paused',
  timerId: null
};

function getNextAutoForwardMode(current) {
  const index = AUTO_FORWARD_MODES.indexOf(current);
  const nextIndex = index >= 0 ? (index + 1) % AUTO_FORWARD_MODES.length : 0;
  return AUTO_FORWARD_MODES[nextIndex];
}

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

function applyAutoForwardState(mode) {
  if (autoForwardState.timerId) {
    clearInterval(autoForwardState.timerId);
    autoForwardState.timerId = null;
  }

  const primaryButton = elements.endDayButton;
  const toggle = elements.autoForwardButton;
  const nextMode = AUTO_FORWARD_MODES.includes(mode) ? mode : 'paused';
  autoForwardState.mode = nextMode;

  const isActive = nextMode !== 'paused';
  const interval = AUTO_FORWARD_INTERVALS[nextMode];

  if (toggle) {
    toggle.classList.toggle('is-active', isActive);
    toggle.setAttribute('aria-pressed', String(isActive));
    toggle.textContent = AUTO_FORWARD_ICONS[nextMode];
    toggle.setAttribute('aria-label', AUTO_FORWARD_LABELS[nextMode]);
    toggle.title = AUTO_FORWARD_TITLES[nextMode];
  }

  if (!isActive || !interval || !primaryButton) {
    return;
  }

  autoForwardState.timerId = setInterval(() => {
    const target = elements.endDayButton;
    if (!target) {
      applyAutoForwardState('paused');
      return;
    }
    if (target.disabled) {
      return;
    }
    target.click();
  }, interval);
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
      const nextMode = getNextAutoForwardMode(autoForwardState.mode);
      applyAutoForwardState(nextMode);
    });
  }

  applyAutoForwardState('paused');
}

export function updateHeaderAction(state) {
  const button = elements.endDayButton;
  if (!button) return;

  const recommendation = selectRecommendation(state);
  applyButtonState(button, recommendation);
}
