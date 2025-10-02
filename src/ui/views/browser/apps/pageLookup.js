import { SERVICE_PAGES } from '../config.js';

export function getPageByType(type) {
  return SERVICE_PAGES.find(entry => entry.type === type) || null;
}

export default {
  getPageByType
};
