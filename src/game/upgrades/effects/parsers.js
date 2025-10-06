const EMPTY_SCOPE = Object.freeze({
  ids: [],
  tags: [],
  families: [],
  categories: []
});

function createScope(overrides = {}) {
  return {
    ids: (overrides.ids || []).filter(Boolean),
    tags: (overrides.tags || []).filter(Boolean),
    families: (overrides.families || []).filter(Boolean),
    categories: (overrides.categories || []).filter(Boolean)
  };
}

export function parseFilterExpression(expression) {
  if (typeof expression !== 'string' || !expression.trim()) {
    return createScope();
  }

  const scope = createScope();
  const segments = expression.split(/[;,]/);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const [rawKey, rawValue] = trimmed.split('=');
    if (!rawValue) continue;

    const key = rawKey.trim().toLowerCase();
    const values = rawValue
      .split('|')
      .map(value => value.trim())
      .filter(Boolean);

    if (!values.length) continue;

    switch (key) {
      case 'id':
      case 'ids':
        scope.ids.push(...values);
        break;
      case 'tag':
      case 'tags':
        scope.tags.push(...values);
        break;
      case 'family':
      case 'families':
        scope.families.push(...values);
        break;
      case 'category':
      case 'categories':
        scope.categories.push(...values);
        break;
      default:
        break;
    }
  }

  return scope;
}

export function parseModifierTarget(target) {
  if (typeof target !== 'string') return null;

  const trimmed = target.trim();
  if (!trimmed) return null;

  const [subjectPart, property] = trimmed.split('.');
  if (!property) return null;

  if (subjectPart.startsWith('asset:')) {
    const id = subjectPart.slice('asset:'.length).trim();
    return {
      subjectType: 'asset',
      property,
      scope: createScope({ ids: id ? [id] : [] })
    };
  }

  if (subjectPart.startsWith('hustle:')) {
    const id = subjectPart.slice('hustle:'.length).trim();
    return {
      subjectType: 'hustle',
      property,
      scope: createScope({ ids: id ? [id] : [] })
    };
  }

  if (subjectPart.startsWith('assets[') && subjectPart.endsWith(']')) {
    const expression = subjectPart.slice('assets['.length, -1);
    return {
      subjectType: 'asset',
      property,
      scope: parseFilterExpression(expression)
    };
  }

  if (subjectPart.startsWith('hustles[') && subjectPart.endsWith(']')) {
    const expression = subjectPart.slice('hustles['.length, -1);
    return {
      subjectType: 'hustle',
      property,
      scope: parseFilterExpression(expression)
    };
  }

  return null;
}

export function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object') {
    return createScope();
  }
  if (scope === EMPTY_SCOPE) {
    return createScope();
  }
  return createScope(scope);
}
