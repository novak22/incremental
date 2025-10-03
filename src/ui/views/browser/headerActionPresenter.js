import { getElement } from '../../elements/registry.js';
import todoWidget from './widgets/todoWidget.js';

const state = {
  primaryButton: null,
  onPrimaryAction: null,
  primaryButtonMinWidth: null
};

function resolveButtons() {
  const nodes = getElement('headerActionButtons') || {};
  state.primaryButton = nodes.endDayButton || state.primaryButton;
  return state;
}

function handlePrimaryClick(event) {
  event.preventDefault();
  const executed = todoWidget.runNextTask();
  if (executed) {
    return;
  }
  if (typeof state.onPrimaryAction === 'function') {
    state.onPrimaryAction();
  }
}

function bindPrimaryButton(button) {
  if (!button) return;
  if (button.dataset.browserActionBound === 'true') return;
  button.addEventListener('click', handlePrimaryClick);
  button.dataset.browserActionBound = 'true';
}

function applyAccessibilityAttributes(button, label) {
  if (!button) return;
  if (label) {
    button.setAttribute('aria-label', label);
  } else {
    button.removeAttribute('aria-label');
  }
}

function renderAction(model) {
  resolveButtons();
  const button = state.primaryButton;
  if (!button) return;

  const hasTasks = todoWidget.hasPendingTasks();
  const nextTask = todoWidget.peekNextTask();
  const label = hasTasks ? 'Next Task' : 'Next Day';
  const title = hasTasks
    ? (nextTask?.title ? `Run next: ${nextTask.title}` : 'Run the next queued task for today.')
    : model?.button?.title || 'Wrap today when you are ready to reset the grind.';

  button.textContent = label;
  ensurePrimaryButtonWidth(button, label);
  button.dataset.actionMode = hasTasks ? 'task' : (model?.button?.mode || 'end');

  if (hasTasks && nextTask?.id) {
    button.dataset.actionId = nextTask.id;
  } else if (model?.button?.actionId) {
    button.dataset.actionId = model.button.actionId;
  } else {
    delete button.dataset.actionId;
  }

  button.classList.toggle('is-recommendation', hasTasks || Boolean(model?.button?.isRecommendation));

  if (title) {
    button.title = title;
  } else {
    button.removeAttribute('title');
  }

  applyAccessibilityAttributes(button, title || label);
  button.disabled = Boolean(model?.button?.disabled);

  bindPrimaryButton(button);
}

function ensurePrimaryButtonWidth(button, label) {
  if (!button) return;

  const measureWidth = () => {
    button.style.removeProperty('--browser-session-button-width');
    const width = Math.ceil(button.getBoundingClientRect().width);
    if (width > 0) {
      state.primaryButtonMinWidth = width;
      button.style.setProperty('--browser-session-button-width', `${width}px`);
    }
  };

  if (label === 'Next Task') {
    measureWidth();
    return;
  }

  if (state.primaryButtonMinWidth) {
    button.style.setProperty('--browser-session-button-width', `${state.primaryButtonMinWidth}px`);
    return;
  }

  const originalText = button.textContent;
  button.textContent = 'Next Task';
  measureWidth();
  button.textContent = originalText;
}

function renderAutoForward() {
  // Browser shell does not expose an auto-forward toggle in the header yet.
}

function init({ onPrimaryAction } = {}) {
  state.onPrimaryAction = typeof onPrimaryAction === 'function' ? onPrimaryAction : null;
  resolveButtons();
  bindPrimaryButton(state.primaryButton);
}

function isPrimaryEnabled() {
  resolveButtons();
  if (!state.primaryButton) return false;
  return !state.primaryButton.disabled;
}

const headerActionPresenter = {
  init,
  renderAction,
  renderAutoForward,
  isPrimaryEnabled
};

export default headerActionPresenter;
