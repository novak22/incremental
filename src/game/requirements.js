import knowledgeTrackData from './requirements/data/knowledgeTracks.js';
import { getState, getActionState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { KNOWLEDGE_REWARDS } from './requirements/knowledgeTracks.js';
import { getKnowledgeProgress } from './requirements/knowledgeProgress.js';
import { getActionDefinition } from '../core/state/registry.js';
import { abandonActionInstance } from './actions/progress/instances.js';
import { createRequirementsOrchestrator } from './requirements/orchestrator.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;
const knowledgeTracks = KNOWLEDGE_TRACKS;

const orchestrator = createRequirementsOrchestrator({
  getState,
  getActionState,
  getActionDefinition,
  abandonActionInstance,
  getKnowledgeProgress,
  knowledgeTracks,
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
  getKnowledgeProgress
};
