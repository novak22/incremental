import { assistantUpgrade } from '../data/economyConfig.js';

const DEFAULT_ASSISTANT_VALUES = {
  hiringCost: 0,
  hourlyRate: 0,
  hoursPerAssistant: 0,
  bonusMinutesPerAssistant: 0,
  dailyWage: 0,
  maxAssistants: 0
};

export const ASSISTANT_CONFIG = Object.freeze({
  ...DEFAULT_ASSISTANT_VALUES,
  ...assistantUpgrade,
  hoursPerAssistant:
    assistantUpgrade.hoursPerAssistant ??
    (assistantUpgrade.bonusMinutesPerAssistant
      ? assistantUpgrade.bonusMinutesPerAssistant / 60
      : DEFAULT_ASSISTANT_VALUES.hoursPerAssistant),
  dailyWage:
    assistantUpgrade.dailyWage ??
    (assistantUpgrade.hourlyRate ?? DEFAULT_ASSISTANT_VALUES.hourlyRate) *
      (assistantUpgrade.hoursPerAssistant ?? DEFAULT_ASSISTANT_VALUES.hoursPerAssistant)
});

