const ALL_UI_SECTIONS = Object.freeze([
  'dashboard',
  'player',
  'skillsWidget',
  'headerAction',
  'cards'
]);

const dirtySections = new Set();

function markEntry(section, flag = true) {
  if (!section) return;
  if (flag) {
    dirtySections.add(section);
  } else {
    dirtySections.delete(section);
  }
}

export function markDirty(sectionOrMap, flag = true) {
  if (typeof sectionOrMap === 'string') {
    markEntry(sectionOrMap, flag);
    return;
  }

  if (Array.isArray(sectionOrMap)) {
    sectionOrMap.forEach(section => markEntry(section, true));
    return;
  }

  if (sectionOrMap && typeof sectionOrMap === 'object') {
    for (const [section, value] of Object.entries(sectionOrMap)) {
      if (section === 'changed') continue;
      markEntry(section, Boolean(value));
    }
  }
}

export function markAllDirty() {
  ALL_UI_SECTIONS.forEach(section => dirtySections.add(section));
}

export function consumeDirty() {
  if (dirtySections.size === 0) {
    return {};
  }

  const result = {};
  dirtySections.forEach(section => {
    result[section] = true;
  });
  dirtySections.clear();
  return result;
}

export { ALL_UI_SECTIONS };

