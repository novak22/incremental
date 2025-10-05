import { appendContent } from '../../../components/common/domHelpers.js';
import { createTaskList } from '../components/lists.js';

const COMPLETED_GROUPS = [
  { key: 'hustles', label: 'Hustles', empty: 'No hustles wrapped yet.' },
  { key: 'education', label: 'Education', empty: 'No study blocks logged yet.' },
  { key: 'upkeep', label: 'Upkeep', empty: 'No upkeep tackled yet.' },
  { key: 'upgrades', label: 'Upgrades', empty: 'No upgrade pushes finished yet.' }
];

function createCompletedSection(completedGroups = {}) {
  const section = document.createElement('section');
  section.className = 'timodoro-section';

  const heading = document.createElement('h3');
  heading.className = 'timodoro-section__title';
  appendContent(heading, 'Completed today');

  const groupsWrapper = document.createElement('div');
  groupsWrapper.className = 'timodoro-section__groups';

  COMPLETED_GROUPS.forEach(groupConfig => {
    const group = document.createElement('section');
    group.className = 'timodoro-subsection';

    const title = document.createElement('h4');
    title.className = 'timodoro-subsection__title';
    appendContent(title, groupConfig.label);

    const entries = Array.isArray(completedGroups[groupConfig.key])
      ? completedGroups[groupConfig.key]
      : [];
    const list = createTaskList(entries, groupConfig.empty, `timodoro-completed-${groupConfig.key}`);

    group.append(title, list);
    groupsWrapper.appendChild(group);
  });

  section.append(heading, groupsWrapper);
  return section;
}

export { COMPLETED_GROUPS, createCompletedSection };
export default createCompletedSection;
