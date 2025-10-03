import { getSkillDefinition } from '../../../game/skills/data.js';
import { KNOWLEDGE_TRACKS } from '../../../game/requirements.js';

export const WORKSPACE_SKILL_LOCKS = {
  blogpress: {
    workspaceLabel: 'BlogPress',
    skillId: 'writing',
    requiredLevel: 1,
    courseId: 'storycraftJumpstart'
  },
  videotube: {
    workspaceLabel: 'VideoTube',
    skillId: 'visual',
    requiredLevel: 1,
    courseId: 'vlogStudioJumpstart'
  },
  digishelf: {
    workspaceLabel: 'DigiShelf',
    skillId: 'editing',
    requiredLevel: 1,
    courseId: 'digitalShelfPrimer'
  },
  shopily: {
    workspaceLabel: 'Shopily',
    skillId: 'commerce',
    requiredLevel: 1,
    courseId: 'commerceLaunchPrimer'
  },
  serverhub: {
    workspaceLabel: 'ServerHub',
    skillId: 'software',
    requiredLevel: 1,
    courseId: 'microSaasJumpstart'
  }
};

const COURSE_TO_WORKSPACE = new Map();
Object.entries(WORKSPACE_SKILL_LOCKS).forEach(([workspaceId, config]) => {
  if (!config?.courseId) return;
  COURSE_TO_WORKSPACE.set(config.courseId, { workspaceId, ...config });
});

export function buildSkillLock(state = {}, workspaceId) {
  const config = WORKSPACE_SKILL_LOCKS[workspaceId];
  if (!config) return null;
  const skillEntry = state?.skills?.[config.skillId] || {};
  const currentLevel = Number(skillEntry.level) || 0;
  const requiredLevel = Number(config.requiredLevel) || 0;
  if (currentLevel >= requiredLevel) {
    return null;
  }

  const skillDefinition = getSkillDefinition(config.skillId);
  const skillName = skillDefinition?.name || config.skillName || config.skillId;
  const courseDefinition = config.courseId ? KNOWLEDGE_TRACKS[config.courseId] : null;
  const courseName = courseDefinition?.name || config.courseName || null;
  const meta = config.meta || `Locked — ${skillName} Lv ${requiredLevel}`;

  return {
    type: 'skill',
    workspaceId,
    workspaceLabel: config.workspaceLabel || workspaceId,
    skillId: config.skillId,
    skillName,
    requiredLevel,
    currentLevel,
    courseId: config.courseId || null,
    courseName,
    meta
  };
}

export function getWorkspaceLockByCourse(courseId) {
  if (!courseId) return null;
  const config = COURSE_TO_WORKSPACE.get(courseId);
  if (!config) return null;
  const skillDefinition = getSkillDefinition(config.skillId);
  const skillName = skillDefinition?.name || config.skillName || config.skillId;
  const courseDefinition = KNOWLEDGE_TRACKS[config.courseId] || null;
  return {
    workspaceId: config.workspaceId,
    workspaceLabel: config.workspaceLabel || config.workspaceId,
    skillId: config.skillId,
    skillName,
    requiredLevel: Number(config.requiredLevel) || 0,
    courseId: config.courseId,
    courseName: courseDefinition?.name || config.courseName || null
  };
}

export function getWorkspaceSkillLockConfig(workspaceId) {
  return WORKSPACE_SKILL_LOCKS[workspaceId] || null;
}
