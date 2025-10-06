export function renderStateDump(container, state) {
  const output = container.querySelector('#developer-state-json');
  if (!output) return;
  output.textContent = JSON.stringify(state, null, 2);
}

export default renderStateDump;
