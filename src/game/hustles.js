import { getInstantHustleDefinitions } from './hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from './hustles/knowledgeHustles.js';
import { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS } from './actions/definitions.js';

const MARKET_HUSTLES = getInstantHustleDefinitions();
export const HUSTLES = MARKET_HUSTLES;
export const KNOWLEDGE_HUSTLES = createKnowledgeHustles();
export { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS };

export * from './hustles/helpers.js';
