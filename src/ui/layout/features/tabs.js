export function setupTabs({ getElement, onActivate } = {}) {
  const lookup = typeof getElement === 'function' ? getElement('shellNavigation') : null;
  const shellTabs = Array.isArray(lookup?.shellTabs) ? lookup.shellTabs : [];
  const panels = Array.isArray(lookup?.panels) ? lookup.panels : [];
  if (!shellTabs.length || !panels.length) {
    return null;
  }

  const activate = targetId => {
    shellTabs.forEach(tab => {
      const isActive = tab?.getAttribute?.('aria-controls') === targetId;
      tab?.classList?.toggle?.('is-active', isActive);
      tab?.setAttribute?.('aria-selected', String(Boolean(isActive)));
      if (tab) {
        tab.tabIndex = isActive ? 0 : -1;
      }
    });
    panels.forEach(panel => {
      if (!panel) return;
      const match = panel.id === targetId;
      panel.classList?.toggle?.('is-active', match);
      panel.hidden = !match;
    });
  };

  shellTabs.forEach(tab => {
    tab?.addEventListener?.('click', () => activate(tab.getAttribute('aria-controls')));
  });
  activate('panel-dashboard');

  if (typeof onActivate === 'function') {
    onActivate(activate);
  }

  return activate;
}

