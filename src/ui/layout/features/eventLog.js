export function setupEventLog({ getElement } = {}) {
  const controls = typeof getElement === 'function' ? getElement('eventLogControls') : null;
  const openEventLog = controls?.openEventLog;
  const eventLogPanel = controls?.eventLogPanel;
  const eventLogClose = controls?.eventLogClose;
  if (!openEventLog || !eventLogPanel) {
    return;
  }

  const toggle = visible => {
    eventLogPanel.hidden = !visible;
    if (visible) {
      eventLogPanel.querySelector('button')?.focus({ preventScroll: true });
    }
  };

  openEventLog.addEventListener('click', () => toggle(true));
  eventLogClose?.addEventListener('click', () => toggle(false));
  eventLogPanel.addEventListener('click', event => {
    if (event.target?.dataset?.close === 'event-log') {
      toggle(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !eventLogPanel.hidden) {
      toggle(false);
    }
  });
}

export default setupEventLog;
