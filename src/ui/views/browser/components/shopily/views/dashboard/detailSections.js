import createStatsSection from './statsPanel.js';
import createQualitySection from './qualityPanel.js';
import createNicheSection from './nichePanel.js';
import createPayoutSection from './payoutPanel.js';
import createActionSection from './actionsPanel.js';

export const DETAIL_THEME = {
  container: 'shopily-detail',
  header: 'shopily-detail__header',
  title: 'shopily-detail__title',
  subtitle: 'shopily-detail__subtitle',
  status: 'shopily-status',
  tabs: 'shopily-detail__tabs',
  stats: 'shopily-detail__stats',
  stat: 'shopily-detail__stat',
  statLabel: 'shopily-detail__stat-label',
  statValue: 'shopily-detail__stat-value',
  statNote: 'shopily-detail__stat-note',
  sections: 'shopily-detail__panels',
  section: 'shopily-panel',
  sectionTitle: 'shopily-panel__title',
  sectionBody: 'shopily-panel__body',
  actions: 'shopily-detail__actions',
  actionButton: 'shopily-button',
  empty: 'shopily-detail__empty'
};

export function mapDetailSections(instance, helpers = {}) {
  const sections = [];
  if (instance.pendingIncome > 0) {
    sections.push({
      className: 'shopily-detail__notice',
      render: ({ article }) => {
        const notice = document.createElement('p');
        notice.className = 'shopily-panel__hint';
        notice.textContent = `Pending payouts: ${helpers.formatCurrency(instance.pendingIncome)} once upkeep clears.`;
        const parent = article.parentNode;
        if (parent) {
          parent.replaceChild(notice, article);
        }
      }
    });
  }
  sections.push({
    className: 'shopily-panel',
    title: 'Store health',
    render: ({ article }) => {
      article.appendChild(createStatsSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: `Quality ${instance.qualityLevel}`,
    render: ({ article }) => {
      article.appendChild(createQualitySection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Audience niche',
    render: ({ article }) => {
      article.appendChild(createNicheSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Payout recap',
    render: ({ article }) => {
      article.appendChild(createPayoutSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Quality actions',
    render: ({ article }) => {
      article.appendChild(createActionSection(instance, helpers));
    }
  });
  return sections;
}
