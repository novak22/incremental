import { createInstantHustle } from '../content/schema.js';
import { getInstantHustleDefinitions } from '../hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from '../hustles/knowledgeHustles.js';
import { createContractTemplate, createStudyTemplate } from './templates/contract.js';

function prepareInstantActions() {
  return getInstantHustleDefinitions().map(config => {
    const definition = createContractTemplate(createInstantHustle(config), {
      progress: {
        type: 'instant',
        completion: 'instant',
        hoursRequired: Number(config.time || config.action?.timeCost || 0)
      }
    });
    definition.kind = 'action';
    return definition;
  });
}

function prepareStudyActions() {
  return createKnowledgeHustles().map(definition => {
    const template = createStudyTemplate(definition, {
      progress: {
        hoursPerDay: definition.studyHoursPerDay || definition.hoursPerDay || null,
        daysRequired: definition.studyDays || definition.days || null
      }
    });
    template.kind = 'action';
    return template;
  });
}

const INSTANT_ACTIONS = prepareInstantActions();
const STUDY_ACTIONS = prepareStudyActions();

export const ACTIONS = [...INSTANT_ACTIONS, ...STUDY_ACTIONS];

export { INSTANT_ACTIONS, STUDY_ACTIONS };

export function getActionDefinitions() {
  return ACTIONS;
}
