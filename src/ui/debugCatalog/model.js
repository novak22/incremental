import { formatHours, formatMoney } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { listCatalog } from '../../game/content/catalog.js';

function renderRequirementSummary(requirements = []) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return 'None';
  }
  return requirements
    .map(requirement => {
      const status = requirement?.met === false ? '⚠️' : '✅';
      const label = requirement?.label || requirement?.type || 'Requirement';
      return `${status} ${label}`;
    })
    .join(' • ');
}

function normalizeEntry(entry) {
  const requirements = Array.isArray(entry?.requirements) ? entry.requirements : [];
  const hasMissingRequirement = requirements.some(requirement => requirement?.met === false);
  return {
    id: entry.actionId,
    source: entry.sourceName,
    sourceTitle: `${entry.sourceType}:${entry.sourceId}`,
    action: entry.label,
    actionTitle: entry.actionId,
    category: entry.category,
    timeText: entry.timeCost ? formatHours(entry.timeCost) : '—',
    timeSatisfied: entry.timeSatisfied !== false,
    moneyText: entry.moneyCost ? `$${formatMoney(entry.moneyCost)}` : '—',
    moneySatisfied: entry.moneySatisfied !== false,
    available: Boolean(entry.available),
    requirementSummary: renderRequirementSummary(requirements),
    requirementsSatisfied: !hasMissingRequirement
  };
}

function sortEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const sourceTypeA = a?.sourceType || '';
    const sourceTypeB = b?.sourceType || '';
    if (sourceTypeA === sourceTypeB) {
      const sourceNameA = a?.sourceName || '';
      const sourceNameB = b?.sourceName || '';
      if (sourceNameA === sourceNameB) {
        const labelA = a?.label || '';
        const labelB = b?.label || '';
        return labelA.localeCompare(labelB);
      }
      return sourceNameA.localeCompare(sourceNameB);
    }
    return sourceTypeA.localeCompare(sourceTypeB);
  });
}

export function buildDebugCatalogViewModel(state = getState()) {
  const evaluatedEntries = listCatalog(state);
  const rows = sortEntries(evaluatedEntries).map(normalizeEntry);
  const availableCount = rows.filter(row => row.available).length;
  const summaryLabel = `${availableCount} of ${rows.length} actions currently available`;
  return {
    rows,
    summary: {
      total: rows.length,
      available: availableCount,
      label: summaryLabel
    }
  };
}

export default {
  buildDebugCatalogViewModel
};
