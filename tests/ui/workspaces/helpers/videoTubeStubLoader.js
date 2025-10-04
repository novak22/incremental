const prefix = 'data:text/javascript,videotube:';

const MATCHERS = [
  {
    test: url => url.endsWith('/src/game/assets/index.js'),
    source: `export function performQualityAction(...args) {
      const calls = globalThis.__videoTubeQualityCalls;
      if (Array.isArray(calls)) {
        calls.push(args);
      }
    }`
  },
  {
    test: url => url.endsWith('/src/game/assets/actions.js'),
    source: `export function setAssetInstanceName(...args) {
      const calls = globalThis.__videoTubeRenameCalls;
      if (Array.isArray(calls)) {
        calls.push(args);
      }
    }`
  },
  {
    test: url => url.endsWith('/src/ui/cards/model/index.js'),
    source: `export function selectVideoTubeNiche(...args) {
      const calls = globalThis.__videoTubeNicheCalls;
      if (Array.isArray(calls)) {
        calls.push(args);
      }
    }`
  }
];

function shouldStub(parentURL) {
  return typeof parentURL === 'string' && parentURL.includes('createVideoTubeWorkspace.js?stub');
}

export async function resolve(specifier, context, nextResolve) {
  const resolution = await nextResolve(specifier, context);
  if (shouldStub(context.parentURL)) {
    const match = MATCHERS.find(entry => entry.test(resolution.url));
    if (match) {
      return {
        url: `${prefix}${encodeURIComponent(match.source)}`,
        shortCircuit: true
      };
    }
  }
  return resolution;
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(prefix)) {
    const source = decodeURIComponent(url.slice(prefix.length));
    return {
      format: 'module',
      source,
      shortCircuit: true
    };
  }
  return nextLoad(url, context);
}
