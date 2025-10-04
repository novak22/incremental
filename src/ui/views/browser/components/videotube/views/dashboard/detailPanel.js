import { ensureArray } from '../../../../../../../core/helpers.js';
import { renderNicheBadge } from './instanceTable.js';

const DETAIL_THEME = {
  container: 'videotube-detail',
  header: 'videotube-detail__header',
  title: 'videotube-detail__title',
  status: 'videotube-status',
  tabs: 'videotube-detail__tabs',
  stats: 'videotube-detail__stats',
  stat: 'videotube-detail__stat',
  statLabel: 'videotube-detail__stat-label',
  statValue: 'videotube-detail__stat-value',
  statNote: 'videotube-detail__stat-note',
  sections: 'videotube-detail__panels',
  section: 'videotube-panel',
  sectionTitle: 'videotube-panel__title',
  sectionBody: 'videotube-panel__body',
  actions: 'videotube-detail__actions',
  actionButton: 'videotube-button',
  empty: 'videotube-detail__empty'
};

function createQualitySection(video) {
  const fragment = document.createDocumentFragment();
  const lead = document.createElement('p');
  lead.className = 'videotube-panel__lead';
  lead.textContent = `Quality ${video.qualityLevel} • ${video.qualityInfo?.name || 'Growing audience'}`;
  const progress = document.createElement('div');
  progress.className = 'videotube-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'videotube-progress__fill';
  progressFill.style.setProperty('--videotube-progress', String((video.milestone?.percent || 0) * 100));
  progress.appendChild(progressFill);
  fragment.append(lead, progress);
  if (video.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.milestone.summary}`;
    fragment.appendChild(summary);
  }
  return fragment;
}

function createNicheSection(video) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderNicheBadge(video));
  if (video.niche?.summary) {
    const note = document.createElement('p');
    note.className = 'videotube-panel__note';
    note.textContent = `${video.niche.label || 'Steady'} • ${video.niche.summary}`;
    fragment.appendChild(note);
  } else if (!video.niche) {
    const hint = document.createElement('p');
    hint.className = 'videotube-panel__note';
    hint.textContent = 'Assign a niche from the detail view to boost payouts.';
    fragment.appendChild(hint);
  }
  return fragment;
}

function createActionSection(video, helpers = {}) {
  const fragment = document.createDocumentFragment();
  if (!video.quickAction) {
    const note = document.createElement('p');
    note.className = 'videotube-panel__note';
    note.textContent = 'No quick actions available yet.';
    fragment.appendChild(note);
    return fragment;
  }
  const detail = document.createElement('p');
  detail.className = 'videotube-panel__note';
  const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
  const formatHours = helpers.formatHours || (value => String(value ?? ''));
  detail.textContent = `${video.quickAction.effect} • ${formatHours(video.quickAction.time)} • ${formatCurrency(video.quickAction.cost)}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'videotube-button videotube-button--secondary';
  button.textContent = video.quickAction.label;
  button.disabled = !video.quickAction.available;
  if (video.quickAction.disabledReason) {
    button.title = video.quickAction.disabledReason;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    helpers.onQuickAction?.(video.id, video.quickAction.id);
  });
  fragment.append(detail, button);
  return fragment;
}

function mapDetailSections(video, helpers = {}) {
  const sections = [];
  sections.push({
    className: 'videotube-panel',
    title: 'Video stats',
    render: ({ article }) => {
      const stats = document.createElement('dl');
      stats.className = 'videotube-stats-grid';
      const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
      const formatPercent = helpers.formatPercent || (value => String(value ?? ''));
      const entries = [
        { label: 'Latest payout', value: formatCurrency(video.latestPayout || 0) },
        { label: 'Daily average', value: formatCurrency(video.averagePayout || 0) },
        { label: 'Lifetime earned', value: formatCurrency(video.lifetimeIncome || 0) },
        { label: 'ROI', value: formatPercent(video.roi || 0) }
      ];
      entries.forEach(entry => {
        const dt = document.createElement('dt');
        dt.textContent = entry.label;
        const dd = document.createElement('dd');
        dd.textContent = entry.value;
        stats.append(dt, dd);
      });
      article.appendChild(stats);
    }
  });
  sections.push(
    {
      className: 'videotube-panel',
      title: 'Quality momentum',
      render: ({ article }) => {
        article.appendChild(createQualitySection(video));
      }
    },
    {
      className: 'videotube-panel',
      title: 'Niche focus',
      render: ({ article }) => {
        article.appendChild(createNicheSection(video));
      }
    },
    {
      className: 'videotube-panel',
      title: 'Quick action',
      render: ({ article }) => {
        article.appendChild(createActionSection(video, helpers));
      }
    }
  );
  return sections;
}

function mapDetailPanel(instances, state, helpers = {}) {
  const selected = ensureArray(instances).find(video => video.id === state.selectedVideoId);
  if (!selected) {
    return {
      theme: DETAIL_THEME,
      className: 'videotube-detail',
      isEmpty: true,
      emptyState: {
        message: 'Select a video to inspect payouts and momentum.'
      }
    };
  }
  return {
    theme: DETAIL_THEME,
    className: 'videotube-detail',
    header: {
      title: selected.label,
      status: {
        className: 'videotube-status',
        label: selected.status?.label || 'Active'
      }
    },
    sections: mapDetailSections(selected, helpers)
  };
}

export {
  DETAIL_THEME,
  createActionSection,
  createNicheSection,
  createQualitySection,
  mapDetailPanel,
  mapDetailSections
};

export default {
  DETAIL_THEME,
  createActionSection,
  createNicheSection,
  createQualitySection,
  mapDetailPanel,
  mapDetailSections
};
