const lock = (theme, fallbackMessage) =>
  Object.freeze({ theme: Object.freeze(theme), fallbackMessage });

export const WORKSPACE_LOCK_THEMES = new Map([
  [
    'blogpress',
    lock(
      {
        container: 'blogpress-view',
        locked: 'blogpress-view--locked',
        message: 'blogpress-empty__message',
        label: 'This workspace'
      },
      'BlogPress unlocks once the Personal Blog blueprint is discovered.'
    )
  ],
  [
    'digishelf',
    lock(
      {
        container: 'digishelf',
        locked: 'digishelf--locked',
        message: 'digishelf-empty',
        label: 'DigiShelf'
      },
      'DigiShelf unlocks once the digital asset blueprints are discovered.'
    )
  ],
  [
    'shopily',
    lock(
      {
        container: 'shopily',
        locked: 'shopily--locked',
        message: 'shopily-empty',
        label: 'Shopily'
      },
      'Shopily unlocks once the Dropshipping blueprint is discovered.'
    )
  ],
  [
    'serverhub',
    lock(
      {
        container: 'serverhub',
        locked: 'serverhub--locked',
        message: 'serverhub-empty',
        label: 'This console'
      },
      'ServerHub unlocks once the SaaS Micro-App blueprint is discovered.'
    )
  ],
  [
    'videotube',
    lock(
      {
        container: 'videotube-view',
        locked: 'videotube-view--locked',
        message: 'videotube-empty',
        label: 'This workspace'
      },
      'VideoTube unlocks once the Vlog blueprint is discovered.'
    )
  ]
]);

export function getWorkspaceLockTheme(id) {
  const config = WORKSPACE_LOCK_THEMES.get(id);
  if (!config) {
    return { theme: {}, fallbackMessage: '' };
  }
  return {
    theme: { ...config.theme },
    fallbackMessage: config.fallbackMessage
  };
}

export default WORKSPACE_LOCK_THEMES;
