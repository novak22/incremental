import { getUpgradeState } from '../../../core/state.js';
import { getUpgrades } from '../../../game/registryService.js';

export const REGISTRY_FALLBACK_MESSAGE =
  'Upgrade registry is still stretching awake—peek back in a blink!';

export function renderUpgradeBuffs(container, state) {
  const list = container.querySelector('#developer-upgrade-list');
  const empty = container.querySelector('#developer-upgrades-empty');
  if (!list) return;

  if (empty && !empty.dataset.defaultText) {
    empty.dataset.defaultText = empty.textContent || '';
  }

  let owned = [];

  try {
    owned = getUpgrades()
      .filter(definition => getUpgradeState(definition.id, state)?.purchased)
      .map(definition => ({
        id: definition.id,
        name: definition.name,
        boosts: definition.boosts || definition.description || '',
        tag: definition.tag?.label || null
      }))
      .filter(entry => Boolean(entry.boosts));
  } catch (error) {
    list.innerHTML = '';
    if (empty) {
      empty.textContent = REGISTRY_FALLBACK_MESSAGE;
      empty.hidden = false;
    }
    return;
  }

  list.innerHTML = '';

  if (!owned.length) {
    if (empty) {
      if (empty.dataset.defaultText) {
        empty.textContent = empty.dataset.defaultText;
      }
      empty.hidden = false;
    }
    return;
  }

  if (empty) {
    if (empty.dataset.defaultText) {
      empty.textContent = empty.dataset.defaultText;
    }
    empty.hidden = true;
  }

  const doc = container.ownerDocument || document;
  owned.forEach(entry => {
    const item = doc.createElement('li');
    item.className = 'developer-buff-card';

    const title = doc.createElement('p');
    title.className = 'developer-buff-card__title';
    title.textContent = entry.name;

    const meta = doc.createElement('p');
    meta.className = 'developer-buff-card__meta';
    meta.textContent = entry.tag ? entry.tag : 'Upgrade boost';

    const notes = doc.createElement('p');
    notes.className = 'developer-buff-card__notes';
    notes.textContent = entry.boosts;

    item.append(title, meta, notes);
    list.appendChild(item);
  });
}

export default renderUpgradeBuffs;
