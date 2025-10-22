import { getElement } from '../../elements/registry.js';
import layoutManager from './widgets/layoutManager.js';

const state = {
  primaryButton: null,
  onPrimaryAction: null,
  onPrimaryModeChange: null,
  primaryButtonMinWidth: null
};

function getTodoWidget() {
  const controller = layoutManager.getWidgetController('todo');
  return controller || null;
}

function resolveButtons() {
  const nodes = getElement('headerActionButtons') || {};
  state.primaryButton = nodes.endDayButton || state.primaryButton;
  return state;
}

function resolveTodoState() {
  const todoWidget = getTodoWidget();
  if (!todoWidget) {
    return {
      hasTasks: false,
      nextTask: null,
      controller: null
    };
  }

  const hasTasks = typeof todoWidget.hasPendingTasks === 'function' ? todoWidget.hasPendingTasks() : false;
  const nextTask = hasTasks && typeof todoWidget.peekNextTask === 'function'
    ? todoWidget.peekNextTask()
    : null;

  return { hasTasks, nextTask, controller: todoWidget };
}

function handlePrimaryClick(event) {
  event.preventDefault();
  const controller = getTodoWidget();
  const executed = typeof controller?.runNextTask === 'function' ? controller.runNextTask() : false;
  if (executed) {
    return;
  }
  const button = state.primaryButton || event?.currentTarget || null;
  const mode = button?.dataset?.actionMode || null;
  if (typeof state.onPrimaryAction === 'function') {
    state.onPrimaryAction({ mode });
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

  const { hasTasks, nextTask } = resolveTodoState();
  const label = hasTasks ? 'Next Task' : 'Next Day';
  const title = hasTasks
    ? (nextTask?.title ? `Run next: ${nextTask.title}` : 'Run the next queued task for today.')
    : model?.button?.title || 'Wrap today when you are ready to reset the grind.';

  button.textContent = label;
  ensurePrimaryButtonWidth(button, label);
  const actionMode = hasTasks ? 'task' : 'end';
  button.dataset.actionMode = actionMode;
  if (typeof state.onPrimaryModeChange === 'function') {
    state.onPrimaryModeChange(actionMode);
  }

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

function init({ onPrimaryAction, onPrimaryModeChange } = {}) {
  state.onPrimaryAction = typeof onPrimaryAction === 'function' ? onPrimaryAction : null;
  state.onPrimaryModeChange = typeof onPrimaryModeChange === 'function' ? onPrimaryModeChange : null;
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
