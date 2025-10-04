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
      layout: {
        introClassName: 'videotube__masthead',
        titleGroupClass: 'videotube__title',
        wrapIntroWithActions: true
      },
      theme: {
        header: 'videotube__header',
        intro: 'videotube__masthead',
        title: 'videotube__title-heading',
        subtitle: 'videotube__subtitle',
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
