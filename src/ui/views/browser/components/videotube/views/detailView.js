import {
  renderActionsPanel,
  renderIncomePanel,
  renderNichePanel,
  renderPayoutPanel,
  renderQualityPanel,
  renderRenameForm,
  renderStatsGrid
} from './detail/index.js';

export function createDetailView(options = {}) {
  const { formatCurrency, formatNetCurrency, formatHours, onQuickAction, onRename, onNicheSelect } = options;

  const panelRenderers = [
    video => renderIncomePanel(video, { formatCurrency, formatNetCurrency }),
    video => renderQualityPanel(video, { formatHours }),
    video => renderPayoutPanel(video, { formatCurrency }),
    video => renderActionsPanel(video, { formatCurrency, formatHours, onQuickAction }),
    video => renderNichePanel(video, { onNicheSelect })
  ];

  return function renderDetailView({ model = {}, state = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--detail';

    const instances = Array.isArray(model.instances) ? model.instances : [];
    const video = instances.find(entry => entry.id === state.selectedVideoId);
    if (!video) {
      const empty = document.createElement('p');
      empty.className = 'videotube-empty';
      empty.textContent = 'Select a video from the dashboard to inspect analytics.';
      container.appendChild(empty);
      return container;
    }

    const header = document.createElement('div');
    header.className = 'videotube-detail__header';

    const title = document.createElement('h2');
    title.textContent = video.label;
    header.appendChild(title);
    header.appendChild(renderRenameForm(video, { onRename }));
    container.appendChild(header);

    container.appendChild(renderStatsGrid(video, { formatCurrency }));

    const grid = document.createElement('div');
    grid.className = 'videotube-detail-grid';
    panelRenderers.forEach(renderPanel => {
      grid.appendChild(renderPanel(video));
    });
    container.appendChild(grid);

    return container;
  };
}

export default {
  createDetailView
};
