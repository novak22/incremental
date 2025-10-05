export function formatLabelFromKey(id, fallback = 'Special') {
  if (!id) return fallback;
  return (
    id
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, match => match.toUpperCase())
      .trim() || fallback
  );
}

export function describeAssetCardSummary(definition) {
  const copy = definition?.cardSummary || definition?.summary || definition?.description;
  if (!copy) return '';
  const trimmed = copy.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}...`;
}

