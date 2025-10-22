import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import madge from 'madge';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');
const baselinePath = path.join(__dirname, 'coupling-baseline.json');

const toPosix = (input) => {
  const normalized = input.replace(/\\/g, '/');
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
};

const trimSrcPrefix = (input) => {
  const normalized = toPosix(input);
  return normalized.startsWith('src/') ? normalized.slice(4) : normalized;
};

const isSegmentMatch = (id, segment) =>
  id === segment || id.startsWith(`${segment}/`);

const loadBaseline = async () => {
  try {
    const file = await readFile(baselinePath, 'utf8');
    const parsed = JSON.parse(file);
    const config = parsed?.uiToGameCoreEdges;

    if (!config || typeof config.threshold !== 'number') {
      throw new Error(
        'Baseline config must provide uiToGameCoreEdges.threshold as a number.'
      );
    }

    return {
      threshold: config.threshold,
      baselineCount: config.baselineCount ?? null,
      metadata: {
        updated: config.updated ?? null,
        description: config.description ?? null,
      },
    };
  } catch (error) {
    throw new Error(
      `Unable to read coupling baseline at ${path.relative(
        repoRoot,
        baselinePath
      )}: ${error.message}`
    );
  }
};

const collectEdges = async () => {
  const graph = await madge(srcDir, {
    baseDir: srcDir,
    fileExtensions: ['js', 'mjs'],
  });

  const dependencyMap = await graph.obj();
  const edges = [];

  for (const [rawSource, rawTargets] of Object.entries(dependencyMap)) {
    const source = trimSrcPrefix(rawSource);
    if (!isSegmentMatch(source, 'ui')) {
      continue;
    }

    for (const rawTarget of rawTargets) {
      const target = trimSrcPrefix(rawTarget);
      if (isSegmentMatch(target, 'core') || isSegmentMatch(target, 'game')) {
        edges.push({
          source,
          target,
        });
      }
    }
  }

  return edges;
};

const aggregate = (edges, keySelector) => {
  const map = new Map();
  for (const edge of edges) {
    const key = keySelector(edge);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

const formatTopCounts = (map, limit = 5) =>
  Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => `  ${id}: ${count}`)
    .join('\n');

const main = async () => {
  const [baseline, edges] = await Promise.all([loadBaseline(), collectEdges()]);
  const edgeCount = edges.length;
  const delta =
    baseline.baselineCount != null ? edgeCount - baseline.baselineCount : null;

  const summary = [
    `ui→game/core coupling edges: ${edgeCount}`,
    `threshold: ${baseline.threshold}`,
  ];

  if (baseline.baselineCount != null) {
    summary.push(`baseline: ${baseline.baselineCount}`);
    if (delta) {
      summary.push(`delta: ${delta > 0 ? '+' : ''}${delta}`);
    }
  }

  if (edgeCount > baseline.threshold) {
    console.error(`\u001b[31m[coupling-check]\u001b[0m ${summary.join(' | ')}`);

    const bySource = aggregate(edges, (edge) => edge.source);
    const byTarget = aggregate(edges, (edge) => edge.target);

    console.error('\nTop UI sources contributing to coupling:');
    console.error(formatTopCounts(bySource));
    console.error('\nMost-referenced game/core modules:');
    console.error(formatTopCounts(byTarget));
    console.error(
      '\nSee docs/engineering/architecture.md for remediation strategies before updating the baseline.'
    );

    process.exitCode = 1;
    return;
  }

  console.log(`[coupling-check] ${summary.join(' | ')}`);
};

main().catch((error) => {
  console.error('\u001b[31m[coupling-check]\u001b[0m unexpected failure');
  console.error(error);
  process.exitCode = 1;
});
