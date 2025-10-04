export function createAnalyticsView(options = {}) {
  const { formatCurrency } = options;

  return function renderAnalyticsView({ model = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--analytics';

    const analytics = model.analytics || { videos: [], niches: [] };

    const grid = document.createElement('div');
    grid.className = 'videotube-analytics';

    const videoCard = document.createElement('article');
    videoCard.className = 'videotube-panel';
    const videoTitle = document.createElement('h3');
    videoTitle.textContent = 'Top earners';
    videoCard.appendChild(videoTitle);
    if (analytics.videos?.length) {
      const list = document.createElement('ul');
      list.className = 'videotube-list';
      analytics.videos.slice(0, 5).forEach(entry => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${entry.label}</strong><span>${formatCurrency(entry.lifetime)} lifetime • ${formatCurrency(entry.latest)} daily</span>`;
        list.appendChild(item);
      });
      videoCard.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'videotube-panel__note';
      empty.textContent = 'No earning history yet. Launch a video to start tracking analytics.';
      videoCard.appendChild(empty);
    }

    const nicheCard = document.createElement('article');
    nicheCard.className = 'videotube-panel';
    const nicheTitle = document.createElement('h3');
    nicheTitle.textContent = 'Niche breakdown';
    nicheCard.appendChild(nicheTitle);
    if (analytics.niches?.length) {
      const list = document.createElement('ul');
      list.className = 'videotube-list';
      analytics.niches.slice(0, 5).forEach(entry => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${entry.niche}</strong><span>${formatCurrency(entry.lifetime)} lifetime • ${formatCurrency(entry.daily)} daily</span>`;
        list.appendChild(item);
      });
      nicheCard.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'videotube-panel__note';
      empty.textContent = 'No niche data yet. Assign niches to start ranking performance.';
      nicheCard.appendChild(empty);
    }

    grid.append(videoCard, nicheCard);
    container.appendChild(grid);
    return container;
  };
}

export default {
  createAnalyticsView
};
