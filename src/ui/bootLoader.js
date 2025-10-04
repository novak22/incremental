const BOOT_LOADER_ID = 'boot-loader';
const EXIT_CLASS = 'boot-loader--is-exiting';

function scheduleRemoval(element) {
  const cleanup = () => {
    element.removeEventListener('transitionend', cleanup);
    element.removeEventListener('animationend', cleanup);
    if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
  };

  element.addEventListener('transitionend', cleanup, { once: true });
  element.addEventListener('animationend', cleanup, { once: true });

  window.setTimeout(() => {
    if (element.isConnected) {
      element.remove();
    }
  }, 1200);
}

export function dismissBootLoader() {
  const loader = document.getElementById(BOOT_LOADER_ID);
  if (!loader || loader.dataset.dismissed === 'true') {
    return;
  }

  loader.dataset.dismissed = 'true';
  loader.classList.add(EXIT_CLASS);
  scheduleRemoval(loader);
}

