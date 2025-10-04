import { formatSlotMap, stripHtml } from './formatting.js';
import { describeEffectSummary } from './effects.js';
import { getRequirementEntries } from './requirements.js';

export function buildHighlights(definition = {}, { definitionMap = new Map() } = {}) {
  const highlights = document.createElement('ul');
  highlights.className = 'shopstack-card__highlights';

  const effectSummary = describeEffectSummary(definition);
  if (effectSummary) {
    const effectItem = document.createElement('li');
    effectItem.textContent = `Bonus: ${effectSummary}`;
    highlights.appendChild(effectItem);
  }

  const requirementEntries = getRequirementEntries(definition, { definitionMap });
  if (requirementEntries.length) {
    const requirementItem = document.createElement('li');
    const unmet = requirementEntries.filter(entry => !entry.met).length;
    const requirementText = requirementEntries
      .map(entry => stripHtml(entry.html).replace(/^Requires:\s*/i, '').trim())
      .join(' • ');
    requirementItem.textContent = unmet
      ? `Needs: ${requirementText}`
      : `Ready: ${requirementText}`;
    highlights.appendChild(requirementItem);
  }

  if (definition.provides || definition.consumes) {
    const list = document.createElement('li');
    const pieces = [];
    if (definition.provides) {
      pieces.push(`Provides: ${formatSlotMap(definition.provides)}`);
    }
    if (definition.consumes) {
      pieces.push(`Consumes: ${formatSlotMap(definition.consumes)}`);
    }
    if (pieces.length) {
      list.innerHTML = pieces.map(text => `<strong>${text}</strong>`).join(' • ');
      highlights.appendChild(list);
    }
  }

  return highlights;
}

export default {
  buildHighlights
};
