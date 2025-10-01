import { MAX_LOG_ENTRIES } from './constants.js';
import { createId } from './helpers.js';
import { getState } from './state.js';
import { buildLogModel } from '../ui/log/model.js';
import { getActiveView } from '../ui/viewManager.js';
import classicLogPresenter from '../ui/views/classic/logPresenter.js';

export function addLog(message, type = 'info') {
  const state = getState();
  if (!state) return;
  const entry = {
    id: createId(),
    timestamp: Date.now(),
    message,
    type
  };
  state.log.push(entry);
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log.splice(0, state.log.length - MAX_LOG_ENTRIES);
  }
  renderLog();
}

export function renderLog() {
  const state = getState();
  if (!state) return;

  const model = buildLogModel(state);
  const presenter = getActiveView()?.presenters?.log ?? classicLogPresenter;
  if (typeof presenter?.render === 'function') {
    presenter.render(model);
  }
}
