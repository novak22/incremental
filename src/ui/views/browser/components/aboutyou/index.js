import { renderKpiGrid } from '../common/renderKpiGrid.js';
import { renderHero } from './hero.js';
import { renderSkillsSection } from './skillsSection.js';
import { renderEducationSection } from './educationSection.js';
import { renderEquipmentSection } from './equipmentSection.js';
import { computeAssetHighlights, renderAssetsSection } from './assetsSection.js';
import { buildMetricEntries, renderMetricsSection } from './metricsSection.js';

function render(context = {}) {
  const { mount, profile = {}, assetsModel = {}, state = {}, dailySummary = {} } = context;
  if (!mount) return null;

  mount.innerHTML = '';
  mount.classList.add('aboutyou');

  renderHero(profile, mount, { renderStats: renderKpiGrid });
  mount.appendChild(renderSkillsSection(profile?.skills));
  mount.appendChild(renderEducationSection(profile?.education));
  mount.appendChild(renderEquipmentSection(profile?.equipment));

  const assetHighlights = computeAssetHighlights(assetsModel);
  mount.appendChild(renderAssetsSection(assetHighlights));

  const metrics = buildMetricEntries(profile?.summary, state, dailySummary, assetHighlights);
  mount.appendChild(renderMetricsSection(metrics));

  return {
    meta: profile?.summary?.title || profile?.summary?.tier || 'Profile ready'
  };
}

export default {
  render
};

export {
  renderHero,
  renderSkillsSection,
  renderEducationSection,
  renderEquipmentSection,
  computeAssetHighlights,
  renderAssetsSection,
  buildMetricEntries,
  renderMetricsSection
};
