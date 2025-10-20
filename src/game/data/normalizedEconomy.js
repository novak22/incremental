let normalizedEconomy;

if (typeof process !== 'undefined' && process.versions?.node) {
  const { readFile } = await import('node:fs/promises');
  const jsonUrl = new URL('../../../docs/normalized_economy.json', import.meta.url);
  const raw = await readFile(jsonUrl, 'utf-8');
  normalizedEconomy = JSON.parse(raw);
} else if (typeof fetch === 'function') {
  const response = await fetch(new URL('../../../docs/normalized_economy.json', import.meta.url));
  if (!response.ok) {
    throw new Error(`Failed to load normalized economy spec: ${response.status} ${response.statusText}`);
  }
  normalizedEconomy = await response.json();
} else {
  throw new Error('Unable to load normalized economy spec in this environment.');
}

export default normalizedEconomy;
