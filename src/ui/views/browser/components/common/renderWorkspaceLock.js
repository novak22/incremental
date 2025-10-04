function isElement(value) {
  return value && typeof value === 'object' && value.nodeType === 1;
}

export function renderWorkspaceLock(target, options = {}) {
  let mount;
  let config;

  if (isElement(target)) {
    mount = target;
    config = options || {};
  } else {
    config = target || {};
  }

  const { theme = {}, lock = null, fallbackMessage = '' } = config;
  const containerTag = theme.containerTag || 'section';
  const container = document.createElement(containerTag);
  const containerClasses = [];
  if (theme.container) {
    containerClasses.push(theme.container);
  }
  if (theme.locked) {
    containerClasses.push(theme.locked);
  }
  if (containerClasses.length) {
    container.className = containerClasses.join(' ');
  }

  const messageTag = theme.messageTag || 'p';
  const message = document.createElement(messageTag);
  if (theme.message) {
    message.className = theme.message;
  }

  const defaultLabel = theme.label || 'This workspace';
  if (lock?.type === 'skill') {
    const workspaceLabel = lock.workspaceLabel || defaultLabel;
    const skillName = lock.skillName || 'Skill';
    const level = lock.requiredLevel != null ? ` Lv ${lock.requiredLevel}` : '';
    const courseNote = lock.courseName ? ` Complete ${lock.courseName} in Learnly to level up instantly.` : '';
    message.textContent = `${workspaceLabel} unlocks at ${skillName}${level}.${courseNote}`;
  } else {
    message.textContent = fallbackMessage || `${defaultLabel} unlocks soon.`;
  }

  container.appendChild(message);

  if (mount) {
    mount.innerHTML = '';
    mount.appendChild(container);
  }

  return container;
}
