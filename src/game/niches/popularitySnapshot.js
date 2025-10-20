const POPULARITY_BANDS = [
  { min: 85, label: 'Blazing', tone: 'hot', summary: 'Audiences are ravenous — capitalize now.' },
  { min: 70, label: 'Surging', tone: 'warm', summary: 'Momentum is building fast and payouts love it.' },
  { min: 55, label: 'Trending', tone: 'warm', summary: 'Steady waves of interest keep income humming.' },
  { min: 40, label: 'Steady', tone: 'steady', summary: 'Reliable attention with room for creative twists.' },
  { min: 25, label: 'Cooling', tone: 'cool', summary: 'Interest is dipping — refresh your hooks soon.' },
  { min: 0, label: 'Dormant', tone: 'cold', summary: 'Only superfans are tuning in today.' }
];

const NEUTRAL_SCORE = 50;

function roundMultiplier(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function describePopularity(score) {
  const numeric = Number(score);
  const target = Number.isFinite(numeric) ? numeric : NEUTRAL_SCORE;
  const band = POPULARITY_BANDS.find(entry => target >= entry.min) || POPULARITY_BANDS.at(-1);
  return {
    label: band?.label || 'Unknown',
    tone: band?.tone || 'steady',
    summary: band?.summary || ''
  };
}

export function createNeutralPopularitySnapshot() {
  const descriptor = describePopularity(NEUTRAL_SCORE);
  return {
    score: NEUTRAL_SCORE,
    previousScore: null,
    delta: null,
    multiplier: 1,
    label: descriptor.label,
    tone: descriptor.tone,
    summary: descriptor.summary
  };
}

export function sanitizePopularitySnapshot(entry) {
  const neutral = createNeutralPopularitySnapshot();
  if (!entry || typeof entry !== 'object') {
    return { ...neutral };
  }

  const score = clampScore(entry.score);
  const previousScore = clampScore(entry.previousScore);
  const descriptor = describePopularity(score ?? neutral.score);
  const multiplier = roundMultiplier(entry.multiplier);
  const deltaRaw = Number(entry.delta);
  const label = typeof entry.label === 'string' && entry.label ? entry.label : descriptor.label;
  const summary = typeof entry.summary === 'string' && entry.summary ? entry.summary : descriptor.summary;
  const tone = typeof entry.tone === 'string' && entry.tone ? entry.tone : descriptor.tone;

  const resolvedScore = score ?? neutral.score;
  const resolvedPrevious = previousScore ?? null;
  const resolvedDelta = Number.isFinite(deltaRaw)
    ? Math.round(deltaRaw)
    : resolvedPrevious != null
    ? resolvedScore - resolvedPrevious
    : null;

  return {
    score: resolvedScore,
    previousScore: resolvedPrevious,
    delta: resolvedDelta,
    multiplier,
    label,
    summary,
    tone
  };
}

export function computePopularitySnapshot({ multiplier, existing }) {
  const neutral = createNeutralPopularitySnapshot();
  const safeMultiplier = roundMultiplier(multiplier);
  const combinedPercent = Math.max(-0.95, safeMultiplier - 1);
  const rawScore = NEUTRAL_SCORE + combinedPercent * 100;
  const score = clampScore(rawScore) ?? neutral.score;
  const descriptor = describePopularity(score);
  const existingSnapshot = sanitizePopularitySnapshot(existing);

  if (existingSnapshot.score === score) {
    return {
      ...existingSnapshot,
      multiplier: safeMultiplier,
      label: descriptor.label,
      summary: descriptor.summary,
      tone: descriptor.tone
    };
  }

  const previousScore = existingSnapshot.score ?? neutral.score;
  const delta = previousScore != null ? score - previousScore : null;

  return {
    score,
    previousScore,
    delta,
    multiplier: safeMultiplier,
    label: descriptor.label,
    summary: descriptor.summary,
    tone: descriptor.tone
  };
}

