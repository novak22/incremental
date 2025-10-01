const DEFAULT_DOCUMENT = typeof document !== 'undefined' ? document : null;

class ElementRegistry {
  constructor(root = DEFAULT_DOCUMENT, resolvers = {}) {
    this.document = root;
    this.resolvers = resolvers || {};
    this.cache = new Map();
  }

  initialize(root = DEFAULT_DOCUMENT, resolvers = this.resolvers) {
    this.document = root;
    this.resolvers = resolvers || {};
    this.cache.clear();
  }

  getRoot() {
    return this.document || DEFAULT_DOCUMENT;
  }

  resolve(key) {
    if (!this.cache.has(key)) {
      const resolver = this.resolvers?.[key];
      const root = this.getRoot();
      const value = resolver && root ? resolver(root) : null;
      this.cache.set(key, value);
    }
    return this.cache.get(key);
  }

  /**
   * Resolve and cache a DOM lookup by key.
   * @param {string} key
   * @returns {unknown}
   */
  get(key) {
    return this.resolve(key);
  }
}

const elementRegistry = new ElementRegistry();

export function initElementRegistry(root, resolvers) {
  elementRegistry.initialize(root, resolvers);
}

const accessors = new Proxy(
  {},
  {
    get(target, key, receiver) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key, receiver);
      }
      return elementRegistry.get(key);
    },
    has(_, key) {
      if (typeof key !== 'string') return false;
      return Boolean(elementRegistry.resolvers?.[key]);
    },
    ownKeys() {
      return Object.keys(elementRegistry.resolvers || {});
    },
    getOwnPropertyDescriptor(target, key) {
      if (typeof key !== 'string' || !(key in (elementRegistry.resolvers || {}))) {
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
      return {
        configurable: true,
        enumerable: true,
        get() {
          return elementRegistry.get(key);
        }
      };
    }
  }
);

/**
 * Resolve a DOM node or group using a registered resolver.
 * Results are cached until the registry is re-initialized.
 *
 * @param {string} key
 * @returns {unknown}
 */
export function getElement(key) {
  return elementRegistry.get(key);
}

/**
 * Proxy that exposes registry lookups as properties.
 * Accessing `elements.money` resolves the `money` resolver.
 */
export const elements = accessors;

export default elementRegistry;
