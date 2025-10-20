export function createTabSessionController({ initTabControls, workspaceManager }) {
  function init() {
    initTabControls({
      onSelectTab: workspaceManager.handleTabSelect,
      onCloseTab: workspaceManager.handleTabClose
    });
  }

  return {
    init
  };
}

