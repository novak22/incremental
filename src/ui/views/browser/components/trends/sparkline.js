const HISTORY_LENGTH = 7;

export function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createSparklineSeries(popularity = {}) {
  const history = Array.isArray(popularity.history)
    ? popularity.history
        .map(clampScore)
        .filter(value => value !== null)
    : [];

  if (history.length >= 2) {
    const trimmed = history.slice(-HISTORY_LENGTH);
    if (trimmed.length >= 2) {
      return trimmed;
    }
  }

  const score = clampScore(popularity.score);
  const previous = clampScore(popularity.previousScore);
  const length = HISTORY_LENGTH;

  if (score === null && previous === null) {
    return Array.from({ length }, () => 0);
  }

  const start = previous !== null ? previous : score ?? 0;
  const end = score !== null ? score : start;

  return Array.from({ length }, (_, index) => {
    const t = length === 1 ? 1 : index / (length - 1);
    return start + (end - start) * t;
  });
}

export function buildSparkline(popularity = {}) {
  const values = createSparklineSeries(popularity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const height = 42;
  const width = 160;
  const range = Math.max(1, max - min);
  const hasSlope = values.some(value => value !== values[0]);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('trends-card__sparkline');

  if (!hasSlope) {
    const line = document.createElementNS(NS, 'path');
    const y = height / 2;
    line.setAttribute('d', `M0 ${y} L${width} ${y}`);
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(line);
    return svg;
  }

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const path = document.createElementNS(NS, 'path');
  const pathData = points
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');
  path.setAttribute('d', pathData);
  path.setAttribute('vector-effect', 'non-scaling-stroke');

  const area = document.createElementNS(NS, 'path');
  const areaData = `M0 ${height} ${pathData} L${width} ${height} Z`;
  area.setAttribute('d', areaData);

  svg.append(area, path);
  return svg;
}
