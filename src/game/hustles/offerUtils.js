const asArray = value => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const toMetadataObject = value => (value && typeof value === 'object' ? value : {});

export function resolveFirstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

export function resolveFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
  }
  return null;
}

function gatherMetadataSources(primary, additional = []) {
  const sources = [];
  for (const entry of asArray(primary)) {
    if (entry) {
      sources.push(toMetadataObject(entry));
    }
  }
  for (const entry of asArray(additional)) {
    if (entry) {
      sources.push(toMetadataObject(entry));
    }
  }
  return sources;
}

const gatherRequirementSources = sources => sources.map(source => {
  const { requirements } = source || {};
  return requirements && typeof requirements === 'object' ? requirements : {};
});

export function resolveOfferHoursFromMetadata(metadataSources, template, extraCandidates = []) {
  const sources = gatherMetadataSources(metadataSources);
  const requirementSources = gatherRequirementSources(sources);
  const extra = asArray(extraCandidates);
  return resolveFirstNumber(
    ...sources.flatMap(source => [source.hoursRequired, source.timeHours, source.hours]),
    ...requirementSources.flatMap(requirements => [requirements.hours, requirements.timeHours]),
    ...extra,
    template?.time,
    template?.action?.timeCost
  );
}

export function resolveOfferHours(offerOrMetadata, template, { metadataSources = [], extraCandidates = [] } = {}) {
  const baseMetadata = offerOrMetadata && typeof offerOrMetadata === 'object'
    ? (offerOrMetadata.metadata ?? offerOrMetadata)
    : {};
  const sources = gatherMetadataSources([baseMetadata, ...asArray(metadataSources)]);
  return resolveOfferHoursFromMetadata(sources, template, extraCandidates);
}

export function resolveOfferPayoutAmountFromMetadata(metadataSources, template, extraCandidates = []) {
  const sources = gatherMetadataSources(metadataSources);
  const extra = asArray(extraCandidates);
  return resolveFirstNumber(
    ...sources.flatMap(source => [source.payoutAmount, source.payout?.amount]),
    ...extra,
    template?.payout?.amount
  );
}

export function resolveOfferPayoutAmount(offerOrMetadata, template, { metadataSources = [], extraCandidates = [] } = {}) {
  const baseMetadata = offerOrMetadata && typeof offerOrMetadata === 'object'
    ? (offerOrMetadata.metadata ?? offerOrMetadata)
    : {};
  const sources = gatherMetadataSources([baseMetadata, ...asArray(metadataSources)]);
  return resolveOfferPayoutAmountFromMetadata(sources, template, extraCandidates);
}

export function resolveOfferPayoutScheduleFromMetadata(metadataSources, fallback = 'onCompletion', extraCandidates = []) {
  const sources = gatherMetadataSources(metadataSources);
  const extra = asArray(extraCandidates);
  return resolveFirstString(
    ...sources.flatMap(source => [source.payoutSchedule, source.payout?.schedule]),
    ...extra
  ) || fallback;
}

export function resolveOfferPayoutSchedule(offerOrMetadata, { metadataSources = [], extraCandidates = [], fallback = 'onCompletion' } = {}) {
  const baseMetadata = offerOrMetadata && typeof offerOrMetadata === 'object'
    ? (offerOrMetadata.metadata ?? offerOrMetadata)
    : {};
  const sources = gatherMetadataSources([baseMetadata, ...asArray(metadataSources)]);
  return resolveOfferPayoutScheduleFromMetadata(sources, fallback, extraCandidates);
}
