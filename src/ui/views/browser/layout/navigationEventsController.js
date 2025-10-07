import { getElement } from '../../../elements/registry.js';

export function createNavigationEventsController({
  navigationController,
  workspaceManager,
  pageResolver,
  dom
}) {
  const { homepageId, findPageById, findPageBySlug } = pageResolver;
  const { buildWorkspaceUrl } = dom;

  function handleSiteClick(event) {
    const control = event.target.closest('[data-site-target]');
    if (!control || !(control instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    const target = control.dataset.siteTarget || homepageId;
    if (target === homepageId) {
      workspaceManager.setActivePage(homepageId, {
        focus: true,
        recordHistory: true,
        ensureTab: false
      });
    } else {
      workspaceManager.openWorkspace(target, { focus: true, recordHistory: true });
    }
  }

  function init() {
    const { backButton, forwardButton, refreshButton } = workspaceManager.getNavigationRefs();
    if (backButton) {
      backButton.addEventListener('click', event => {
        event.preventDefault();
        navigationController.navigateBack(pageId => {
          workspaceManager.setActivePage(pageId, {
            recordHistory: false,
            focus: true,
            ensureTab: false
          });
        });
      });
    }

    if (forwardButton) {
      forwardButton.addEventListener('click', event => {
        event.preventDefault();
        navigationController.navigateForward(pageId => {
          workspaceManager.setActivePage(pageId, {
            recordHistory: false,
            focus: true,
            ensureTab: false
          });
        });
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', workspaceManager.refreshActivePage);
    }

    const controls = workspaceManager.getSessionControls();
    if (controls?.homeButton) {
      controls.homeButton.addEventListener('click', () =>
        workspaceManager.setActivePage(homepageId, { focus: true, ensureTab: false })
      );
    }

    const address = workspaceManager.getAddressBar();
    if (address.form) {
      const handler = navigationController.createAddressSubmitHandler({
        getValue: () => String(address.input?.value || ''),
        setValue: value => {
          if (address.input) {
            address.input.value = value;
          }
        },
        onNavigate: pageId => workspaceManager.setActivePage(pageId),
        findPageById,
        findPageBySlug,
        formatAddress: page => buildWorkspaceUrl(page)
      });
      address.form.addEventListener('submit', handler);
    }

    const siteList = getElement('siteList');
    if (siteList) {
      siteList.addEventListener('click', handleSiteClick);
    }

    const homepage = dom.getHomepageElement();
    if (homepage) {
      homepage.addEventListener('click', handleSiteClick);
    }

    workspaceManager.setActivePage(navigationController.getCurrentPage(), {
      recordHistory: false,
      ensureTab: false
    });
    navigationController.updateButtons(workspaceManager.getNavigationRefs());
  }

  return {
    init
  };
}

export default createNavigationEventsController;
