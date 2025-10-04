import { ensureArray } from '../../../../../../core/helpers.js';
import { buildHighlights } from './highlights.js';
import { buildRequirementList } from './requirementList.js';
import { getRequirementEntries } from './requirements.js';

export function collectDetailStrings(definition) {
  const details = ensureArray(definition?.details);
  return details
    .map(detail => {
      if (typeof detail === 'function') {
        try {
          return detail(definition);
        } catch (error) {
          return '';
        }
      }
      return detail;
    })
    .filter(Boolean);
}

export function buildDetailSections(definition = {}, { definitionMap = new Map() } = {}) {
  const sections = [];

  const highlightsSection = document.createElement('section');
  highlightsSection.className = 'shopstack-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'What this gives you';
  highlightsSection.append(highlightsHeading, buildHighlights(definition, { definitionMap }));
  sections.push(highlightsSection);

  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'shopstack-detail__section';
  const requirementsHeading = document.createElement('h3');
  requirementsHeading.textContent = 'Prerequisites';
  requirementsSection.append(
    requirementsHeading,
    buildRequirementList(getRequirementEntries(definition, { definitionMap }))
  );
  sections.push(requirementsSection);

  const specSection = document.createElement('section');
  specSection.className = 'shopstack-detail__section';
  const specHeading = document.createElement('h3');
  specHeading.textContent = 'Deep dive';
  const specList = document.createElement('ul');
  specList.className = 'shopstack-detail__specs';
  const details = collectDetailStrings(definition);
  details.forEach(entry => {
    const item = document.createElement('li');
    if (typeof Node !== 'undefined' && entry instanceof Node) {
      item.appendChild(entry);
    } else {
      item.innerHTML = entry;
    }
    specList.appendChild(item);
  });
  if (!specList.children.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional notes—install and enjoy the boost!';
    specList.appendChild(item);
  }
  specSection.append(specHeading, specList);
  sections.push(specSection);

  return sections;
}

export default {
  collectDetailStrings,
  buildDetailSections
};
