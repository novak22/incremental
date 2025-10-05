import { findEvents } from '../../core/state/events.js';

export function getNicheEvents(state, nicheId) {
  if (!nicheId) return [];
  return findEvents(state, event => event.target?.type === 'niche' && event.target.nicheId === nicheId);
}

export default getNicheEvents;
