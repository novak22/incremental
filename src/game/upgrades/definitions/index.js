import house from './house.js';
import infra from './infra.js';
import support from './support.js';
import tech from './tech.js';

export const UPGRADE_DEFINITIONS = [...infra, ...tech, ...house, ...support];
