import { endDay } from '../../game/lifecycle.js';
import { buildHeaderActionModel } from './model.js';
import { getActiveView } from '../viewManager.js';
import classicHeaderActionPresenter from '../views/classic/headerActionPresenter.js';

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

let activeRecommendation = null;
let presenterRef = null;
let activeViewId = null;

function refreshPresenterState() {
  const view = getActiveView();
  const nextViewId = view?.id || null;
  if (nextViewId !== activeViewId) {
    activeViewId = nextViewId;
    presenterRef = null;
  }
}

function getPresenter() {
  refreshPresenterState();
  const view = getActiveView();
  if (view?.presenters?.headerAction) {
    return view.presenters.headerAction;
  }
  if (!view) {
    return classicHeaderActionPresenter;
  }
  return null;
}

function getNextMode(current) {
  const index = AUTO_FORWARD_MODES.indexOf(current);
  const nextIndex = index >= 0 ? (index + 1) % AUTO_FORWARD_MODES.length : 0;
  return AUTO_FORWARD_MODES[nextIndex];
}

function handlePrimaryAction() {
  if (activeRecommendation?.onClick) {
    activeRecommendation.onClick();
    return;
  }
  endDay(false);
}

function applyAutoForwardState(mode) {
  if (autoForwardState.timerId) {
    clearInterval(autoForwardState.timerId);
    autoForwardState.timerId = null;
  }

  const presenter = getPresenter();
  const nextMode = AUTO_FORWARD_MODES.includes(mode) ? mode : 'paused';
  autoForwardState.mode = nextMode;

  const isActive = nextMode !== 'paused';
  const interval = AUTO_FORWARD_INTERVALS[nextMode];

  presenter?.renderAutoForward?.({
    mode: nextMode,
    isActive,
    icon: AUTO_FORWARD_ICONS[nextMode],
    label: AUTO_FORWARD_LABELS[nextMode],
    title: AUTO_FORWARD_TITLES[nextMode]
  });

  if (!isActive || !interval) {
    return;
  }

  autoForwardState.timerId = setInterval(() => {
    const latestPresenter = getPresenter();
    if (!latestPresenter?.isPrimaryEnabled || !latestPresenter.isPrimaryEnabled()) {
      return;
    }
    handlePrimaryAction();
  }, interval);
}

function cycleAutoForward() {
  const nextMode = getNextMode(autoForwardState.mode);
  applyAutoForwardState(nextMode);
}

export function initHeaderActionControls() {
  refreshPresenterState();
  const presenter = getPresenter();
  if (presenter && presenter !== presenterRef) {
    presenter?.init?.({
      onPrimaryAction: handlePrimaryAction,
      onAutoForwardToggle: cycleAutoForward
    });
    presenterRef = presenter;
  }
  applyAutoForwardState('paused');
}

export function renderHeaderAction(model) {
  activeRecommendation = model?.recommendation || null;
  const presenter = getPresenter();
  presenter?.renderAction?.(model);
}

export default {
  initHeaderActionControls,
  renderHeaderAction
};
