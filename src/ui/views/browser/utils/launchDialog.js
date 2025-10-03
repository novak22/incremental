const BODY_LOCK_CLASS = 'has-launch-dialog';

function createElement(tag, className, textContent = null) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (textContent !== null && textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

function buildRow(label, value) {
  const row = createElement('div', 'launch-dialog__row');
  const term = createElement('dt', 'launch-dialog__label', label);
  const description = createElement('dd', 'launch-dialog__value', value);
  row.append(term, description);
  return row;
}

function applyTheme(element, theme) {
  if (!theme) return;
  element.classList.add(`launch-dialog--${theme}`);
}

function applyOverlayTheme(element, theme) {
  if (!theme) return;
  element.classList.add(`launch-dialog-overlay--${theme}`);
}

export function showLaunchConfirmation(options = {}) {
  if (typeof document === 'undefined') {
    return Promise.resolve(true);
  }

  const {
    theme = 'default',
    icon = '🚀',
    title = 'Launch this project?',
    resourceName = 'project',
    tagline = 'Double-check your commitments before lighting the fuse.',
    setupSummary = 'Instant launch',
    upkeepSummary = 'No upkeep required',
    confirmLabel = 'Launch now',
    cancelLabel = 'Not yet'
  } = options;

  return new Promise(resolve => {
    const overlay = createElement('div', 'launch-dialog-overlay');
    applyOverlayTheme(overlay, theme);

    const modal = createElement('div', 'launch-dialog');
    applyTheme(modal, theme);

    const glow = createElement('div', 'launch-dialog__glow');
    modal.appendChild(glow);

    const header = createElement('header', 'launch-dialog__header');
    const iconWrapper = createElement('div', 'launch-dialog__icon', icon);
    header.appendChild(iconWrapper);

    const titleElement = createElement(
      'h2',
      'launch-dialog__title',
      title.replace('{name}', resourceName)
    );
    header.appendChild(titleElement);

    const taglineElement = createElement(
      'p',
      'launch-dialog__tagline',
      tagline.replace('{name}', resourceName)
    );
    header.appendChild(taglineElement);
    modal.appendChild(header);

    const summary = createElement('dl', 'launch-dialog__summary');
    summary.append(
      buildRow('Setup commitment', setupSummary),
      buildRow('Daily upkeep', upkeepSummary)
    );
    modal.appendChild(summary);

    const footer = createElement('footer', 'launch-dialog__actions');
    const cancelButton = createElement('button', 'launch-dialog__button launch-dialog__button--secondary', cancelLabel);
    cancelButton.type = 'button';
    const confirmButton = createElement('button', 'launch-dialog__button launch-dialog__button--primary', confirmLabel);
    confirmButton.type = 'button';
    footer.append(cancelButton, confirmButton);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add(BODY_LOCK_CLASS);

    const cleanup = result => {
      overlay.remove();
      document.body.classList.remove(BODY_LOCK_CLASS);
      document.removeEventListener('keydown', handleKeydown);
      resolve(result);
    };

    const handleKeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(false);
      }
    };

    cancelButton.addEventListener('click', () => cleanup(false));
    confirmButton.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        cleanup(false);
      }
    });

    document.addEventListener('keydown', handleKeydown);
    confirmButton.focus();
  });
}

export default {
  showLaunchConfirmation
};
