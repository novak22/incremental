import { assistantHooks } from './assistantBehavior.js';
import { coffeeHooks } from './coffeeBehavior.js';
import { courseHooks } from './courseBehavior.js';
import { createReplacementHooks } from './replacementHelpers.js';

export const UPGRADE_BEHAVIORS = {
  assistant: assistantHooks,
  creatorPhonePro: createReplacementHooks('creatorPhone'),
  creatorPhoneUltra: createReplacementHooks('creatorPhonePro'),
  editingWorkstation: createReplacementHooks('studioLaptop'),
  quantumRig: createReplacementHooks('editingWorkstation'),
  coffee: coffeeHooks,
  course: courseHooks
};
