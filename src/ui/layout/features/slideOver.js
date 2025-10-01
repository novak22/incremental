export function setupSlideOver({ getElement } = {}) {
  const lookup = typeof getElement === 'function' ? getElement('slideOver') : null;
  const slideOver = lookup?.slideOver;
  const slideOverBackdrop = lookup?.slideOverBackdrop;
  const slideOverClose = lookup?.slideOverClose;
  if (!slideOver) {
    return;
  }

  const hide = () => {
    slideOver.hidden = true;
    if (slideOver.dataset) {
      slideOver.dataset.mode = '';
    }
  };

  slideOverBackdrop?.addEventListener('click', hide);
  slideOverClose?.addEventListener('click', hide);
  slideOver.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  });

  document.addEventListener('mousedown', event => {
    if (slideOver.hidden) return;
    const panel = slideOver.querySelector?.('.slide-over__panel');
    if (panel?.contains?.(event.target)) return;
    hide();
  });

  slideOver.hidePanel = hide;
}

export default setupSlideOver;
