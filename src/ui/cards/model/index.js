import buildAssetModels, {
  getAssetGroupLabel,
  getAssetGroupId,
  getAssetGroupNote,
  describeAssetLaunchAvailability
} from './assets.js';
import buildHustleModels from './hustles.js';
import buildUpgradeModels, {
  getUpgradeCategory,
  getUpgradeFamily,
  getCategoryCopy,
  getFamilyCopy,
  buildUpgradeCategories,
  getUpgradeSnapshot,
  describeUpgradeStatus
} from './upgrades.js';
import buildEducationModels, { buildSkillRewards, resolveTrack } from './education.js';
import buildFinanceModel from './finance/index.js';
import {
  formatLabelFromKey,
  describeAssetCardSummary,
  formatInstanceUpkeep
} from '../utils.js';
import buildBlogpressModel, { selectNiche as selectBlogpressNiche } from './blogpress.js';
import buildVideoTubeModel, { selectNiche as selectVideoTubeNiche } from './videotube.js';
import buildDigishelfModel, {
  selectDigishelfNiche,
  getQuickActionIds as getDigishelfQuickActionIds
} from './digishelf.js';
import buildShopilyModel, { selectNiche as selectShopilyNiche } from './shopily.js';
import buildTrendsModel from './trends.js';
import buildServerHubModel, { selectServerHubNiche } from './serverhub.js';
import { ensureDefaultBuilders, registerModelBuilder } from '../modelBuilderRegistry.js';

function registerDefaultCardBuilders() {
  registerModelBuilder(
    'hustles',
    registries => buildHustleModels(registries.hustles),
    { isDefault: true }
  );
  registerModelBuilder(
    'education',
    registries => buildEducationModels(registries.education),
    { isDefault: true }
  );
  registerModelBuilder(
    'assets',
    registries => buildAssetModels(registries.assets),
    { isDefault: true }
  );
  registerModelBuilder(
    'upgrades',
    registries => buildUpgradeModels(registries.upgrades),
    { isDefault: true }
  );
  registerModelBuilder(
    'finance',
    registries => buildFinanceModel(registries),
    { isDefault: true }
  );
}

ensureDefaultBuilders(registerDefaultCardBuilders);

export {
  buildAssetModels,
  getAssetGroupLabel,
  getAssetGroupId,
  getAssetGroupNote,
  describeAssetLaunchAvailability,
  buildHustleModels,
  buildUpgradeModels,
  getUpgradeCategory,
  getUpgradeFamily,
  getCategoryCopy,
  getFamilyCopy,
  buildUpgradeCategories,
  getUpgradeSnapshot,
  describeUpgradeStatus,
  buildEducationModels,
  buildSkillRewards,
  resolveTrack,
  buildFinanceModel,
  formatLabelFromKey,
  describeAssetCardSummary,
  formatInstanceUpkeep,
  buildBlogpressModel,
  selectBlogpressNiche,
  buildVideoTubeModel,
  selectVideoTubeNiche,
  buildDigishelfModel,
  selectDigishelfNiche,
  getDigishelfQuickActionIds,
  buildShopilyModel,
  selectShopilyNiche,
  buildTrendsModel,
  buildServerHubModel,
  selectServerHubNiche
};
