function applyActiveState(button, isActive, activeClassName, withAriaPressed) {
  if (!button) return;
  if (activeClassName && isActive) {
    button.classList.add(activeClassName);
  } else if (activeClassName) {
    button.classList.remove(activeClassName);
  }
  if (withAriaPressed) {
    button.setAttribute('aria-pressed', String(Boolean(isActive)));
  }
}

export function createNavButton({
  className,
  label,
  view,
  onSelect,
  isActive = false,
  badge = null,
  badgeClassName,
  activeClassName = 'is-active',
  datasetKey = 'view',
  withAriaPressed = false
} = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  if (className) {
    button.className = className;
  }
  if (datasetKey && view != null) {
    button.dataset[datasetKey] = view;
  }
  if (label != null) {
    button.textContent = label;
  }
  if (badge != null) {
    const badgeElement = document.createElement('span');
    if (badgeClassName) {
      badgeElement.className = badgeClassName;
    }
    badgeElement.textContent = String(badge);
    button.appendChild(badgeElement);
  }

  applyActiveState(button, Boolean(isActive), activeClassName, withAriaPressed);

  if (typeof onSelect === 'function') {
    button.addEventListener('click', () => onSelect(view));
  }

  return button;
}

export function createNavTabs({
  navClassName,
  buttonClassName,
  buttons = [],
  onSelect,
  activeClassName = 'is-active',
  badgeClassName,
  datasetKey = 'view',
  withAriaPressed = false
} = {}) {
  const nav = document.createElement('nav');
  if (navClassName) {
    nav.className = navClassName;
  }

  buttons.forEach(buttonConfig => {
    const button = createNavButton({
      ...buttonConfig,
      className: buttonClassName,
      onSelect,
      activeClassName,
      badgeClassName,
      datasetKey,
      withAriaPressed
    });
    nav.appendChild(button);
  });

  return nav;
}
