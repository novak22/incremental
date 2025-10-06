import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../../game/requirements.js';
import { describeTrackEducationBonuses } from '../../../game/educationEffects.js';

function buildEducationBuffs(state) {
  return Object.values(KNOWLEDGE_TRACKS)
    .map(track => {
      const progress = getKnowledgeProgress(track.id, state) || {};
      const status = progress.completed ? 'Completed' : progress.enrolled ? 'In progress' : 'Not enrolled';
      const details = describeTrackEducationBonuses(track.id).map(descriptor => {
        try {
          return descriptor();
        } catch (error) {
          return null;
        }
      });
      return {
        id: track.id,
        name: track.name,
        progress,
        status,
        details: details.filter(Boolean)
      };
    })
    .filter(entry => entry.details.length > 0 || entry.progress?.enrolled || entry.progress?.completed);
}

export function renderEducationBuffs(container, state) {
  const list = container.querySelector('#developer-education-list');
  const empty = container.querySelector('#developer-education-empty');
  if (!list) return;

  const entries = buildEducationBuffs(state);
  list.innerHTML = '';

  if (!entries.length) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  const doc = container.ownerDocument || document;
  entries.forEach(entry => {
    const item = doc.createElement('li');
    item.className = 'developer-buff-card';

    const title = doc.createElement('p');
    title.className = 'developer-buff-card__title';
    title.textContent = entry.name;

    const meta = doc.createElement('p');
    meta.className = 'developer-buff-card__meta';
    meta.textContent = `${entry.status} • ${entry.progress.daysCompleted || 0}/${
      entry.progress.totalDays ?? entry.progress.daysTotal ?? 0
    } days`;

    const notes = doc.createElement('p');
    notes.className = 'developer-buff-card__notes';
    notes.textContent = entry.details.join(' ');

    item.append(title, meta, notes);
    list.appendChild(item);
  });
}

export default renderEducationBuffs;
