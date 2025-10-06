const STUDY_TRACK_PREFIX = 'study-';

function normalizeTrackValue(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith(STUDY_TRACK_PREFIX)) {
    const stripped = trimmed.slice(STUDY_TRACK_PREFIX.length).trim();
    return stripped || null;
  }
  return trimmed;
}

function normalizeDefinitionValue(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith(STUDY_TRACK_PREFIX)) {
    return null;
  }
  const stripped = trimmed.slice(STUDY_TRACK_PREFIX.length).trim();
  return stripped || null;
}

function collectArrayCandidates(values = []) {
  if (!Array.isArray(values)) {
    return null;
  }
  for (const value of values) {
    const candidate = normalizeTrackValue(value);
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

export function resolveStudyTrackId(...inputs) {
  const queue = [];
  const visited = new Set();

  const enqueue = value => {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    queue.push(value);
  };

  for (const input of inputs) {
    if (!input) {
      continue;
    }
    if (typeof input === 'string') {
      const candidate = normalizeTrackValue(input);
      if (candidate) {
        return candidate;
      }
      continue;
    }
    if (Array.isArray(input)) {
      const candidate = collectArrayCandidates(input);
      if (candidate) {
        return candidate;
      }
      input.forEach(item => {
        if (item && typeof item === 'object') {
          enqueue(item);
        }
      });
      continue;
    }
    if (typeof input === 'object') {
      enqueue(input);
    }
  }

  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const trackCandidates = [
      current.studyTrackId,
      current.trackId,
      current?.metadata?.studyTrackId,
      current?.metadata?.trackId,
      current?.progress?.studyTrackId,
      current?.progress?.trackId,
      current?.progress?.metadata?.studyTrackId,
      current?.progress?.metadata?.trackId
    ];

    for (const candidate of trackCandidates) {
      const resolved = normalizeTrackValue(candidate);
      if (resolved) {
        return resolved;
      }
    }

    const arrayCandidates = [
      current.trackIds,
      current?.metadata?.trackIds,
      current?.progress?.trackIds,
      current?.progress?.metadata?.trackIds
    ];

    for (const values of arrayCandidates) {
      const resolved = collectArrayCandidates(values);
      if (resolved) {
        return resolved;
      }
    }

    const definitionCandidates = [
      current.definitionId,
      current?.metadata?.definitionId,
      current?.progress?.definitionId,
      current?.progress?.metadata?.definitionId,
      current.id
    ];

    for (const candidate of definitionCandidates) {
      const resolved = normalizeDefinitionValue(candidate);
      if (resolved) {
        return resolved;
      }
    }

    const nestedValues = [
      current.metadata,
      current.progress,
      current.definition,
      current.entry,
      current.instance,
      current.offer,
      current.accepted,
      current.claimMetadata,
      current.source,
      current.details,
      current.data,
      current.context
    ];

    for (const nested of nestedValues) {
      if (!nested) {
        continue;
      }
      if (Array.isArray(nested)) {
        for (const item of nested) {
          if (typeof item === 'string') {
            const resolved = normalizeTrackValue(item);
            if (resolved) {
              return resolved;
            }
            const definitionResolved = normalizeDefinitionValue(item);
            if (definitionResolved) {
              return definitionResolved;
            }
          } else if (item && typeof item === 'object') {
            enqueue(item);
          }
        }
      } else if (typeof nested === 'string') {
        const resolved = normalizeTrackValue(nested) || normalizeDefinitionValue(nested);
        if (resolved) {
          return resolved;
        }
      } else if (typeof nested === 'object') {
        enqueue(nested);
      }
    }
  }

  return null;
}

export default { resolveStudyTrackId };
