import { createInstantHustle } from '../content/schema.js';
import { getInstantHustleDefinitions } from '../hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from '../hustles/knowledgeHustles.js';
import { createStudyTemplate } from './templates/contract.js';

function prepareInstantActions() {
  return getInstantHustleDefinitions().map(config => {
    const definition = createInstantHustle(config);
    definition.kind = definition.kind || 'action';
    return definition;
  });
}

function prepareStudyActions() {
  return createKnowledgeHustles().map(definition => {
    const { templateOptions = {}, ...studyDefinition } = definition;
    const template = createStudyTemplate(studyDefinition, {
      ...templateOptions,
      templateKind: 'manual',
      category: studyDefinition.category || 'study',
      progress: {
        hoursPerDay: studyDefinition.studyHoursPerDay || studyDefinition.hoursPerDay || null,
        daysRequired: studyDefinition.studyDays || studyDefinition.days || null
      }
    });
    template.kind = template.kind || 'action';
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
