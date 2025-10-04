import buildAssetModels from './assets.js';
import buildHustleModels from './hustles.js';
import buildUpgradeModels from './upgrades.js';
import buildEducationModels from './education.js';
import buildFinanceModel from './finance/index.js';
import { selectNiche as selectBlogpressNiche } from './blogpress.js';
import { selectNiche as selectVideoTubeNiche } from './videotube.js';
import {
  selectDigishelfNiche,
  getQuickActionIds as getDigishelfQuickActionIds
} from './digishelf.js';
import { selectNiche as selectShopilyNiche } from './shopily.js';
import buildTrendsModel from './trends.js';
import { selectServerHubNiche } from './serverhub.js';
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
  buildHustleModels,
  buildUpgradeModels,
  buildEducationModels,
  buildFinanceModel,
  selectBlogpressNiche,
  selectVideoTubeNiche,
  selectDigishelfNiche,
  getDigishelfQuickActionIds,
  selectShopilyNiche,
  buildTrendsModel,
  selectServerHubNiche
};
