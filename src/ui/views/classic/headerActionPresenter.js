import { getElement } from '../../elements/registry.js';

const state = {
  primaryButton: null,
  autoForwardButton: null
};

function resolveButtons() {
  const nodes = getElement('headerActionButtons') || {};
  state.primaryButton = nodes.endDayButton || state.primaryButton;
  state.autoForwardButton = nodes.autoForwardButton || state.autoForwardButton;
  return state;
}

function applyRecommendation(button, buttonModel = {}) {
  if (!button) return;
  button.textContent = buttonModel.text || 'End Day';
  button.dataset.actionMode = buttonModel.mode || 'end';
  if (buttonModel.actionId) {
    button.dataset.actionId = buttonModel.actionId;
  } else {
    delete button.dataset.actionId;
  }
  if (buttonModel.title) {
    button.title = buttonModel.title;
  } else {
    button.removeAttribute('title');
  }
  button.classList.toggle('is-recommendation', Boolean(buttonModel.isRecommendation));
}

function applyAutoForward(button, autoForwardModel = {}) {
  if (!button) return;
  const { isActive, icon, label, title } = autoForwardModel;
  button.classList.toggle('is-active', Boolean(isActive));
  button.setAttribute('aria-pressed', String(Boolean(isActive)));
  if (icon) {
    button.textContent = icon;
  }
  if (label) {
    button.setAttribute('aria-label', label);
  }
  if (title) {
    button.title = title;
  }
}

function init({ onPrimaryAction, onAutoForwardToggle } = {}) {
  const { endDayButton, autoForwardButton } = getElement('headerActionButtons') || {};
  state.primaryButton = endDayButton || null;
  state.autoForwardButton = autoForwardButton || null;

  if (state.primaryButton && typeof onPrimaryAction === 'function') {
    state.primaryButton.addEventListener('click', event => {
      event.preventDefault();
      onPrimaryAction();
    });
  }

  if (state.autoForwardButton && typeof onAutoForwardToggle === 'function') {
    state.autoForwardButton.addEventListener('click', event => {
      event.preventDefault();
      onAutoForwardToggle();
    });
  }
}

function renderAction(model) {
  resolveButtons();
  applyRecommendation(state.primaryButton, model?.button);
}

function renderAutoForward(model) {
  resolveButtons();
  applyAutoForward(state.autoForwardButton, model);
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
