import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { spendMoney } from './currency.js';
import { spendTime } from './time.js';
import { recordCostContribution, recordTimeContribution } from './metrics.js';
import { awardSkillProgress } from './skills/index.js';
import knowledgeTracks, { KNOWLEDGE_REWARDS, KNOWLEDGE_TRACKS } from './requirements/knowledgeTracks.js';
import { getKnowledgeProgress } from './requirements/knowledgeProgress.js';
import { estimateManualMaintenanceReserve } from './requirements/maintenanceReserve.js';
import { getDefinitionRequirements } from './requirements/definitionRequirements.js';
import {
  buildAssetRequirementDescriptor,
  describeRequirement,
  formatAssetRequirementLabel,
  summarizeAssetRequirements,
  renderAssetRequirementDetail,
  listAssetRequirementDescriptors,
  updateAssetCardLock
} from './requirements/descriptors.js';
import {
  isRequirementMet,
  definitionRequirementsMet,
  assetRequirementsMetById
} from './requirements/checks.js';
import { createRequirementsOrchestrator } from './requirements/orchestrator.js';

const orchestrator = createRequirementsOrchestrator({
  getState,
  getKnowledgeProgress,
  knowledgeTracks,
  knowledgeRewards: KNOWLEDGE_REWARDS,
  estimateMaintenanceReserve: estimateManualMaintenanceReserve,
  spendMoney,
  spendTime,
  recordCostContribution,
  recordTimeContribution,
  awardSkillProgress,
  addLog
});

export const {
  enrollInKnowledgeTrack,
  dropKnowledgeTrack,
  allocateDailyStudy,
  advanceKnowledgeTracks
} = orchestrator;

export {
  KNOWLEDGE_TRACKS,
  KNOWLEDGE_REWARDS,
  getKnowledgeProgress,
  estimateManualMaintenanceReserve,
  getDefinitionRequirements,
  buildAssetRequirementDescriptor,
  describeRequirement,
  formatAssetRequirementLabel,
  summarizeAssetRequirements,
  renderAssetRequirementDetail,
  listAssetRequirementDescriptors,
  updateAssetCardLock,
  isRequirementMet,
  definitionRequirementsMet,
  assetRequirementsMetById
};
