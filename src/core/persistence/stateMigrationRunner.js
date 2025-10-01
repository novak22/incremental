export class StateMigrationRunner {
  constructor({ migrations = [] } = {}) {
    this.migrations = Array.isArray(migrations) ? migrations : [];
  }

  get version() {
    return this.migrations.length;
  }

  run(snapshot, context) {
    if (!snapshot || typeof snapshot !== 'object') {
      return context.clone(context.defaultState);
    }

    if (!this.migrations.length) {
      return { ...snapshot };
    }

    let current = { ...snapshot };
    const startVersion = Number.isInteger(current.version) ? current.version : 0;
    const runnerContext = { ...context, version: this.version };

    if (startVersion < this.version) {
      for (let index = Math.max(0, startVersion); index < this.migrations.length; index += 1) {
        const step = this.migrations[index];
        if (typeof step !== 'function') continue;
        current = step(current, runnerContext);
        if (!current || typeof current !== 'object') {
          throw new Error(`Migration at index ${index} did not return an object.`);
        }
      }
    }

    current.version = Math.max(this.version, startVersion);
    return current;
  }
}
