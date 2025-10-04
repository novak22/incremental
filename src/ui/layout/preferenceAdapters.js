const adapters = new Map();
let defaultsRegistered = false;

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Preference adapter must be an object.');
  }
  const { section, elementKey, read } = adapter;
  if (!section || typeof section !== 'string') {
    throw new Error('Preference adapter requires a string "section" key.');
  }
  if (!elementKey || typeof elementKey !== 'string') {
    throw new Error(`Preference adapter "${section}" requires an elementKey.`);
  }
  if (typeof read !== 'function') {
    throw new Error(`Preference adapter "${section}" requires a read function.`);
  }
}

function registerPreferenceAdapter(adapter, { isDefault = false } = {}) {
  validateAdapter(adapter);
  adapters.set(adapter.section, adapter);
  if (isDefault) {
    defaultsRegistered = true;
  }
  return () => {
    if (adapters.get(adapter.section) === adapter) {
      adapters.delete(adapter.section);
    }
  };
}

function getPreferenceAdapters() {
  return Array.from(adapters.values());
}

function resetPreferenceAdapters() {
  adapters.clear();
  defaultsRegistered = false;
}

const DEFAULT_ADAPTERS = [
  {
    section: 'hustles',
    elementKey: 'hustleControls',
    read(elementLookup = {}) {
      const { hustleAvailableToggle, hustleSort, hustleSearch } = elementLookup;
      if (!hustleAvailableToggle && !hustleSort && !hustleSearch) {
        return null;
      }
      return {
        availableOnly: Boolean(hustleAvailableToggle?.checked),
        sort: hustleSort?.value,
        query: hustleSearch?.value ?? ''
      };
    }
  },
  {
    section: 'assets',
    elementKey: 'assetFilters',
    read(elementLookup = {}) {
      const { activeOnly, maintenance, lowRisk } = elementLookup;
      if (!activeOnly && !maintenance && !lowRisk) {
        return null;
      }
      return {
        activeOnly: Boolean(activeOnly?.checked),
        maintenanceOnly: Boolean(maintenance?.checked),
        hideHighRisk: Boolean(lowRisk?.checked)
      };
    }
  },
  {
    section: 'upgrades',
    elementKey: 'upgradeFilters',
    read(elementLookup = {}) {
      const { unlocked } = elementLookup;
      if (!unlocked) {
        return null;
      }
      return { readyOnly: unlocked.checked !== false };
    }
  },
  {
    section: 'study',
    elementKey: 'studyFilters',
    read(elementLookup = {}) {
      const { activeOnly, hideComplete } = elementLookup;
      if (!activeOnly && !hideComplete) {
        return null;
      }
      return {
        activeOnly: Boolean(activeOnly?.checked),
        hideComplete: Boolean(hideComplete?.checked)
      };
    }
  }
];

function ensureDefaultPreferenceAdapters() {
  if (defaultsRegistered) {
    return;
  }
  DEFAULT_ADAPTERS.forEach(adapter => registerPreferenceAdapter(adapter, { isDefault: true }));
  defaultsRegistered = true;
}

export { getPreferenceAdapters, resetPreferenceAdapters, ensureDefaultPreferenceAdapters };
