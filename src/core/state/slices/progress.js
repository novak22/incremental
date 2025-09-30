export function ensureSlice(state) {
  if (!state) return {};
  state.progress = state.progress || {};
  state.progress.knowledge = state.progress.knowledge || {};
  return state.progress;
}

export function getSliceState(state, id) {
  if (!state) return {};
  const progress = ensureSlice(state);
  if (!id) {
    return progress;
  }
  progress[id] = progress[id] || {};
  return progress[id];
}

export default {
  ensureSlice,
  getSliceState
};
