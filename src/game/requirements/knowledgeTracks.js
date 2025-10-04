import knowledgeTrackData from './data/knowledgeTracks.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;

export const KNOWLEDGE_REWARDS = {
  storycraftJumpstart: { baseXp: 120, skills: ['writing'] },
  vlogStudioJumpstart: { baseXp: 120, skills: ['visual'] },
  digitalShelfPrimer: { baseXp: 120, skills: ['editing'] },
  commerceLaunchPrimer: { baseXp: 120, skills: ['commerce'] },
  microSaasJumpstart: { baseXp: 120, skills: ['software'] },
  outlineMastery: { baseXp: 120, skills: ['writing'] },
  photoLibrary: {
    baseXp: 120,
    skills: [
      { id: 'visual', weight: 0.5 },
      { id: 'editing', weight: 0.5 }
    ]
  },
  ecomPlaybook: {
    baseXp: 120,
    skills: [
      { id: 'research', weight: 0.5 },
      { id: 'commerce', weight: 0.5 }
    ]
  },
  automationCourse: {
    baseXp: 120,
    skills: [
      { id: 'software', weight: 0.6 },
      { id: 'infrastructure', weight: 0.4 }
    ]
  },
  brandVoiceLab: {
    baseXp: 100,
    skills: [
      { id: 'audience', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  guerillaBuzzWorkshop: {
    baseXp: 110,
    skills: [
      { id: 'promotion', weight: 0.6 },
      { id: 'audience', weight: 0.4 }
    ]
  },
  curriculumDesignStudio: {
    baseXp: 150,
    skills: [
      { id: 'audience', weight: 0.6 },
      { id: 'writing', weight: 0.4 }
    ]
  },
  postProductionPipelineLab: {
    baseXp: 150,
    skills: [
      { id: 'editing', weight: 0.7 },
      { id: 'visual', weight: 0.3 }
    ]
  },
  fulfillmentOpsMasterclass: {
    baseXp: 140,
    skills: [
      { id: 'commerce', weight: 0.7 },
      { id: 'promotion', weight: 0.3 }
    ]
  },
  customerRetentionClinic: {
    baseXp: 140,
    skills: [
      { id: 'audience', weight: 0.4 },
      { id: 'promotion', weight: 0.3 },
      { id: 'software', weight: 0.3 }
    ]
  },
  narrationPerformanceWorkshop: {
    baseXp: 130,
    skills: [
      { id: 'audio', weight: 0.6 },
      { id: 'writing', weight: 0.4 }
    ]
  },
  galleryLicensingSummit: {
    baseXp: 140,
    skills: [
      { id: 'visual', weight: 0.6 },
      { id: 'commerce', weight: 0.4 }
    ]
  },
  syndicationResidency: {
    baseXp: 150,
    skills: [
      { id: 'promotion', weight: 0.5 },
      { id: 'audience', weight: 0.3 },
      { id: 'writing', weight: 0.2 }
    ]
  }
};

export { KNOWLEDGE_TRACKS };

const knowledgeTrackCatalog = KNOWLEDGE_TRACKS;
export default knowledgeTrackCatalog;
