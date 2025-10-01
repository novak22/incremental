import { createInstantHustle } from './content/schema.js';
import { getInstantHustleDefinitions } from './hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from './hustles/knowledgeHustles.js';

const INSTANT_HUSTLES = getInstantHustleDefinitions().map(definition => createInstantHustle(definition));
const KNOWLEDGE_HUSTLES = createKnowledgeHustles();

export const HUSTLES = [...INSTANT_HUSTLES, ...KNOWLEDGE_HUSTLES];

export * from './hustles/helpers.js';
