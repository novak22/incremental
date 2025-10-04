export function createVideoTubeHeader() {
  return function buildHeader(model = {}, state = {}, { setView } = {}) {
    const actions = [
      {
        label: 'Create New Video',
        className: 'videotube-button videotube-button--primary',
        onClick: () => setView?.('create')
      }
    ];

    return {
      className: 'videotube__header',
      theme: {
        header: 'videotube__header',
        intro: 'videotube__title',
        actions: 'videotube__actions',
        actionButton: 'videotube-button',
        nav: 'videotube-tabs',
        button: 'videotube-tab'
      },
      title: 'VideoTube Studio',
      subtitle: 'Manage uploads, hype premieres, and celebrate every payout.',
      actions,
      nav: {
        theme: {
          nav: 'videotube-tabs',
          button: 'videotube-tab'
        }
      }
    };
  };
}

export default {
  createVideoTubeHeader
};
