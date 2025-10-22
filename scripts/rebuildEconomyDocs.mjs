import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_PATH = path.resolve(ROOT_DIR, 'docs', 'normalized_economy.json');
const APPENDIX_PATH = path.resolve(ROOT_DIR, 'docs', 'EconomySpec.appendix.md');

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  if (Number.isInteger(numeric)) {
    return numeric.toString();
  }
  return numeric.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return `$${formatNumber(value)}`;
}

function formatMinutes(value) {
  if (!value) {
    return value === 0 ? '0' : '—';
  }
  return `${formatNumber(value)} min`;
}

function formatVariance(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${formatNumber(value * 100)}%`;
}

function formatDailyLimit(value) {
  if (value === null || value === undefined) {
    return '∞';
  }
  return formatNumber(value);
}

function formatSkillSplit(split) {
  if (!split || split.length === 0) {
    return '—';
  }
  return split
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }
      const percent = entry.weight !== undefined ? `${formatNumber(entry.weight * 100)}%` : '—';
      return `${entry.id} ${percent}`;
    })
    .join(', ');
}

function formatRequirements(requirements) {
  if (!requirements || requirements.length === 0) {
    return '—';
  }
  return requirements
    .map((req) => {
      if (typeof req === 'string') {
        return req;
      }
      if (req.assetId) {
        return `${req.assetId}×${formatNumber(req.count ?? 1)}`;
      }
      if (req.id) {
        return `${req.id}${req.type ? ` (${req.type})` : ''}`;
      }
      return JSON.stringify(req);
    })
    .join(', ');
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function renderTable(headers, rows) {
  if (rows.length === 0) {
    return '_No data found._';
  }
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((row) => `| ${row.map((cell) => escapeCell(cell)).join(' | ')} |`);
  return [headerLine, separatorLine, ...rowLines].join('\n');
}

function buildAppendix(json) {
  const timestamp = new Date().toISOString();

  const assetRows = Object.values(json.assets ?? {})
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((asset) => [
      asset.name,
      asset.schedule
        ? `${formatNumber(asset.schedule.setup_days)} d × ${formatNumber(asset.schedule.setup_minutes_per_day)} min`
        : formatMinutes(asset.setup_time),
      formatCurrency(asset.setup_cost),
      formatMinutes(asset.maintenance_time ?? 0),
      formatCurrency(asset.maintenance_cost ?? 0),
      formatCurrency(asset.base_income),
      formatVariance(asset.variance ?? 0),
    ]);

  const hustleRows = Object.values(json.hustles ?? {})
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((hustle) => [
      hustle.name,
      formatMinutes(hustle.setup_time),
      formatCurrency(hustle.setup_cost),
      formatCurrency(hustle.base_income),
      formatDailyLimit(hustle.daily_limit),
      formatRequirements(hustle.requirements),
      Array.isArray(hustle.skills)
        ? hustle.skills
            .map((skill) =>
              typeof skill === 'string'
                ? skill
                : `${skill.id} ${formatNumber((skill.weight ?? 0) * 100)}%`,
            )
            .join(', ')
        : '—',
    ]);

  const trackRows = Object.values(json.tracks ?? {})
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((track) => [
      track.name,
      track.schedule
        ? `${formatNumber(track.schedule.days)} d × ${formatNumber(track.schedule.minutes_per_day)} min`
        : formatMinutes(track.setup_time),
      formatCurrency(track.setup_cost),
      formatNumber(track.rewards?.base_xp ?? 0),
      formatSkillSplit(track.rewards?.skill_split),
    ]);

  const upgradeRows = Object.values(json.upgrades ?? {})
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((upgrade) => [
      upgrade.name,
      upgrade.category ?? '—',
      formatCurrency(upgrade.setup_cost),
      upgrade.repeatable ? 'Yes' : 'No',
      upgrade.notes ?? '—',
    ]);

  const modifierTaxonomy = new Map();
  for (const modifier of json.modifiers ?? []) {
    const domain = modifier.target?.includes(':')
      ? modifier.target.split(':')[0]
      : modifier.target?.split('.')[0] ?? 'misc';
    const key = `${modifier.type}|${domain}`;
    if (!modifierTaxonomy.has(key)) {
      modifierTaxonomy.set(key, {
        type: modifier.type,
        domain,
        count: 0,
        sample: modifier,
      });
    }
    const bucket = modifierTaxonomy.get(key);
    bucket.count += 1;
  }

  const taxonomyRows = Array.from(modifierTaxonomy.values())
    .sort((a, b) => {
      if (a.type === b.type) {
        return a.domain.localeCompare(b.domain);
      }
      return a.type.localeCompare(b.type);
    })
    .map((bucket) => [
      bucket.type ?? '—',
      bucket.domain,
      formatNumber(bucket.count),
      bucket.sample
        ? `${bucket.sample.source ?? '—'} → ${bucket.sample.target ?? '—'}`
        : '—',
    ]);

  const modifierRows = (json.modifiers ?? [])
    .map((modifier) => [
      modifier.source ?? '—',
      modifier.target ?? '—',
      modifier.type ?? '—',
      modifier.formula ?? '—',
      modifier.notes ?? '—',
    ]);

  return [
    '# Economy Specification Appendix (Auto-generated)',
    '',
    `Last generated: ${timestamp}`,
    '',
    '## Asset Summary',
    renderTable(
      [
        'Asset',
        'Setup Schedule',
        'Setup Cost',
        'Maintenance Time',
        'Maintenance Cost',
        'Base Income',
        'Variance',
      ],
      assetRows,
    ),
    '',
    '## Hustle Summary',
    renderTable(
      ['Hustle', 'Action Time', 'Cash Cost', 'Base Payout', 'Daily Limit', 'Requirements', 'Skills'],
      hustleRows,
    ),
    '',
    '## Knowledge Track Summary',
    renderTable(
      ['Track', 'Study Schedule', 'Tuition', 'Base XP', 'Skill Split'],
      trackRows,
    ),
    '',
    '## Upgrade Summary',
    renderTable(
      ['Upgrade', 'Category', 'Cost', 'Repeatable', 'Notes'],
      upgradeRows,
    ),
    '',
    '## Modifier Taxonomy',
    renderTable(['Type', 'Domain', 'Count', 'Example'], taxonomyRows),
    '',
    '## Modifier Catalog',
    renderTable(['Source', 'Target', 'Type', 'Formula', 'Notes'], modifierRows),
    '',
    '_Generated from docs/normalized_economy.json._',
    '',
  ].join('\n');
}

async function main() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const json = JSON.parse(raw);

  const appendix = buildAppendix(json);
  await fs.writeFile(APPENDIX_PATH, `${appendix}\n`, 'utf8');

  console.log('Economy documentation rebuilt.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
