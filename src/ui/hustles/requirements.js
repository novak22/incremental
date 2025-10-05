export function describeRequirementGuidance(requirements = []) {
  const entries = Array.isArray(requirements) ? requirements : [];
  const unmet = entries.filter(requirement => requirement && requirement.met === false);
  if (!unmet.length) {
    return '';
  }

  const notes = [];

  const limitEntry = unmet.find(requirement => requirement?.type === 'limit');
  if (limitEntry) {
    notes.push('Daily limit reached — resets tomorrow.');
  }

  const labelFromRequirement = requirement => {
    if (!requirement) return '';
    const hint = typeof requirement.hint === 'string' ? requirement.hint.trim() : '';
    if (hint) return hint;
    const label = typeof requirement.label === 'string' ? requirement.label.trim() : '';
    return label;
  };

  const ensureSentence = value => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return '';
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  };

  const otherLabels = unmet
    .filter(requirement => requirement?.type !== 'limit')
    .map(labelFromRequirement)
    .filter(label => label.length > 0);

  if (otherLabels.length === 1) {
    notes.push(ensureSentence(`Unlock tip: ${otherLabels[0]}`));
  } else if (otherLabels.length > 1) {
    notes.push(ensureSentence(`Unlock tip: ${otherLabels.join(' • ')}`));
  }

  return notes.join(' ').trim();
}

export default {
  describeRequirementGuidance
};
