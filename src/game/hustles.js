import { createKnowledgeHustles } from './hustles/knowledgeHustles.js';
import { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS } from './actions/definitions.js';
import { rollDailyOffers, getAvailableOffers } from './hustles/market.js';

const knowledgeHustles = createKnowledgeHustles();

export const KNOWLEDGE_HUSTLES = knowledgeHustles;
export const HUSTLE_TEMPLATES = ACTIONS;
export const HUSTLES = HUSTLE_TEMPLATES;

export { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS };
export { rollDailyOffers, getAvailableOffers };

export * from './hustles/helpers.js';
