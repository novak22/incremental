export class SnapshotRepository {
  constructor({ storageKey, storage = globalThis?.localStorage } = {}) {
    this.storageKey = storageKey;
    this.storage = storage;
  }

  loadRaw() {
    try {
      const rawSnapshot = this.storage?.getItem(this.storageKey) ?? null;
      if (!rawSnapshot) {
        return { type: 'empty' };
      }
      return { type: 'success', value: rawSnapshot };
    } catch (error) {
      return { type: 'error', error };
    }
  }

  saveRaw(rawSnapshot) {
    try {
      this.storage?.setItem(this.storageKey, rawSnapshot);
      return { type: 'success' };
    } catch (error) {
      return { type: 'error', error };
    }
  }
}
