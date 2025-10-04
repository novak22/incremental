import knowledgeTrackData from './requirements/data/knowledgeTracks.js';
import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { spendMoney } from './currency.js';
import { spendTime } from './time.js';
import { recordCostContribution, recordTimeContribution } from './metrics.js';
import { awardSkillProgress } from './skills/index.js';
import { KNOWLEDGE_REWARDS } from './requirements/knowledgeTracks.js';
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

const KNOWLEDGE_TRACKS = knowledgeTrackData;
const knowledgeTracks = KNOWLEDGE_TRACKS;

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
  buildAssetRequirementDescriptor,
  formatAssetRequirementLabel,
  summarizeAssetRequirements,
  renderAssetRequirementDetail,
  listAssetRequirementDescriptors,
  updateAssetCardLock,
  assetRequirementsMetById
};
