import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const stylesDir = path.join(projectRoot, 'styles');
const outputFile = path.join(stylesDir, 'browser.css');

const sectionOrder = ['base', 'components', 'widgets', 'workspaces', 'overlays'];

const sectionFileOrder = {
  base: ['theme.css', 'layout.css'],
  components: ['buttons.css', 'notifications.css'],
  widgets: ['widgets.css', 'home.css', 'apps.css', 'todo.css', 'bank.css'],
  workspaces: [
    'workspaces.css',
    'learnly.css',
    'shopstack.css',
    'videotube.css',
    'shopily.css',
    'serverhub.css',
    'timodoro.css',
  ],
  overlays: ['launch-dialog.css'],
};

async function readSectionFiles(section) {
  const sectionDir = path.join(stylesDir, section);

  let entries;
  try {
    entries = await fs.readdir(sectionDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const preferred = sectionFileOrder[section] ?? [];
  const orderMap = new Map(preferred.map((name, index) => [name, index]));
  const defaultRank = preferred.length;

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const rankA = orderMap.has(a) ? orderMap.get(a) : defaultRank;
      const rankB = orderMap.has(b) ? orderMap.get(b) : defaultRank;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.localeCompare(b);
    });

  const contents = [];
  for (const file of files) {
    const filePath = path.join(sectionDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    if (content.trim().length === 0) {
      continue;
    }
    contents.push({ filePath, content: content.replace(/\r\n/g, '\n') });
  }

  return contents;
}

async function build() {
  const parts = [];
  const sources = [];

  for (const section of sectionOrder) {
    const files = await readSectionFiles(section);
    for (const file of files) {
      const normalized = file.content.endsWith('\n') ? file.content : `${file.content}\n`;
      parts.push(normalized);
      sources.push(path.relative(projectRoot, file.filePath));
    }
  }

  const output = parts.join('');
  await fs.writeFile(outputFile, output, 'utf8');

  if (sources.length === 0) {
    console.log('No CSS modules found. Wrote empty styles/browser.css.');
  } else {
    console.log(`Built ${path.relative(projectRoot, outputFile)} from ${sources.length} modules.`);
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

