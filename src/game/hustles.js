import { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS } from './actions/definitions.js';
import { rollDailyOffers, getAvailableOffers } from './hustles/market.js';

export const HUSTLE_TEMPLATES = INSTANT_ACTIONS;
export const HUSTLES = HUSTLE_TEMPLATES;
export const KNOWLEDGE_HUSTLES = STUDY_ACTIONS;

export { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS };
export { rollDailyOffers, getAvailableOffers };

export * from './hustles/helpers.js';
