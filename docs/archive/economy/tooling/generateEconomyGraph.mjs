// Archived helper: regenerate the retired economy modifier graph for reference only.
import { promises as fs } from 'fs';
import path from 'path';

const DATA_PATH = path.resolve('docs/normalized_economy.json');
const OUTPUT_PATH = path.resolve('docs/archive/economy/economy_graph.mmd');

function sanitizeId(label, index) {
  const base = label
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  const candidate = base || `node_${index}`;
  return `${candidate}_${index}`;
}

function escapeLabel(label) {
  return label.replace(/"/g, '\\"');
}

function formatEdgeLabel(mod) {
  const raw = mod.notes || mod.formula || mod.type;
  return raw.replace(/\|/g, '/').replace(/\n/g, ' ');
}

async function main() {
  const json = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  const modifiers = json.modifiers ?? [];

  const entityIds = new Map();
  const nodes = [];

  function ensureEntity(label) {
    if (!entityIds.has(label)) {
      const id = sanitizeId(label, entityIds.size);
      entityIds.set(label, { id, label });
      nodes.push({ id, label });
    }
    return entityIds.get(label).id;
  }

  const edges = modifiers.map((mod, index) => {
    const sourceId = ensureEntity(mod.source);
    const targetId = ensureEntity(mod.target);
    return { ...mod, index, sourceId, targetId };
  });

  // Build adjacency for cycle detection
  const adjacency = new Map();
  function addEdge(from, to) {
    if (!adjacency.has(from)) {
      adjacency.set(from, new Set());
    }
    adjacency.get(from).add(to);
  }
  edges.forEach(({ sourceId, targetId }) => addEdge(sourceId, targetId));

  const cycles = [];
  const visited = new Set();
  const stack = new Set();
  const path = [];

  function dfs(node) {
    visited.add(node);
    stack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node);
    if (neighbors) {
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next);
        } else if (stack.has(next)) {
          const cycleStart = path.indexOf(next);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            cycle.push(next);
            const cycleKey = cycle.join('>');
            if (!cycles.find((c) => c.join('>') === cycleKey)) {
              cycles.push(cycle);
            }
          }
        }
      }
    }

    stack.delete(node);
    path.pop();
  }

  for (const { id } of nodes) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  const redundancyMap = new Map();
  const redundantKeys = new Set();
  edges.forEach((edge) => {
    const key = [edge.source, edge.target, edge.type, edge.formula, edge.notes]
      .map((value) => value ?? '')
      .join('|');
    if (redundancyMap.has(key)) {
      redundantKeys.add(key);
      redundancyMap.get(key).push(edge.index);
    } else {
      redundancyMap.set(key, [edge.index]);
    }
  });

  const redundantDetails = Array.from(redundantKeys).map((key) => {
    const indices = redundancyMap.get(key);
    return {
      key,
      count: indices.length,
    };
  });

  const lines = [];
  lines.push('%% Auto-generated economy modifier graph');
  lines.push(`%% Total modifiers: ${edges.length}`);
  if (cycles.length === 0) {
    lines.push('%% Cycle detection: none');
  } else {
    cycles.forEach((cycle, idx) => {
      const labels = cycle.map((id) => {
        const match = nodes.find((n) => n.id === id);
        return match ? match.label : id;
      });
      lines.push(`%% Cycle ${idx + 1}: ${labels.join(' -> ')}`);
    });
  }
  if (redundantDetails.length === 0) {
    lines.push('%% Redundant modifiers: none');
  } else {
    redundantDetails.forEach(({ key, count }, idx) => {
      lines.push(`%% Redundant ${idx + 1} (count ${count}): ${key}`);
    });
  }
  lines.push('graph LR');

  nodes.forEach(({ id, label }) => {
    lines.push(`  ${id}["${escapeLabel(label)}"]`);
  });

  edges.forEach((edge) => {
    const label = escapeLabel(formatEdgeLabel(edge));
    lines.push(`  ${edge.sourceId} -->|${label}| ${edge.targetId}`);
  });

  await fs.writeFile(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');
}

main().catch((error) => {
  console.error('Failed to generate economy graph:', error);
  process.exit(1);
});
