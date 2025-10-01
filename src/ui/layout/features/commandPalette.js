export function setupCommandPalette({ getElement } = {}) {
  const lookup = typeof getElement === 'function' ? getElement('commandPalette') : null;
  const commandPalette = lookup?.commandPalette;
  const commandPaletteTrigger = lookup?.commandPaletteTrigger;
  const commandPaletteBackdrop = lookup?.commandPaletteBackdrop;
  const commandPaletteSearch = lookup?.commandPaletteSearch;
  if (!commandPalette || !commandPaletteTrigger) {
    return;
  }

  const show = () => {
    commandPalette.hidden = false;
    commandPaletteSearch?.focus?.({ preventScroll: true });
  };

  const hide = () => {
    commandPalette.hidden = true;
    if (commandPaletteSearch) {
      commandPaletteSearch.value = '';
    }
  };

  commandPaletteTrigger.addEventListener('click', show);
  commandPaletteBackdrop?.addEventListener('click', hide);
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      show();
    }
    if (event.key === 'Escape' && !commandPalette.hidden) {
      hide();
    }
  });

  commandPalette.hidePalette = hide;
}

export default setupCommandPalette;
