export function isHustleDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    return false;
  }
  const category = typeof definition.category === 'string'
    ? definition.category.trim().toLowerCase()
    : null;
  if (category === 'hustle') {
    return true;
  }
  const templateKind = typeof definition.templateKind === 'string'
    ? definition.templateKind.trim().toLowerCase()
    : null;
  if (templateKind === 'hustle') {
    return true;
  }
  const type = typeof definition.type === 'string'
    ? definition.type.trim().toLowerCase()
    : null;
  if (type === 'hustle') {
    return true;
  }
  if (definition.market) {
    return true;
  }
  const tagType = typeof definition.tag?.type === 'string'
    ? definition.tag.type.trim().toLowerCase()
    : null;
  return tagType === 'instant';
}

