import { createInstantHustle } from './content/schema.js';
import { getInstantHustleDefinitions } from './hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from './hustles/knowledgeHustles.js';
import { rollDailyOffers, getAvailableOffers } from './hustles/market.js';

const INSTANT_HUSTLES = getInstantHustleDefinitions().map(definition => createInstantHustle(definition));
const KNOWLEDGE_HUSTLES = createKnowledgeHustles();

export const HUSTLE_TEMPLATES = [...INSTANT_HUSTLES, ...KNOWLEDGE_HUSTLES];
export const HUSTLES = HUSTLE_TEMPLATES;

export * from './hustles/helpers.js';
export { rollDailyOffers, getAvailableOffers };
