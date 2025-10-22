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

export function getAssistantHoursPerAssistant() {
  return Number(ASSISTANT_CONFIG.hoursPerAssistant) || 0;
}

export function getAssistantMaxCount() {
  return Number(ASSISTANT_CONFIG.maxAssistants) || 0;
}

export function getAssistantHourlyRate() {
  return Number(ASSISTANT_CONFIG.hourlyRate) || 0;
}

export function getAssistantHiringCost() {
  return Number(ASSISTANT_CONFIG.hiringCost) || 0;
}

export function getAssistantDailyWage() {
  return Number(ASSISTANT_CONFIG.dailyWage) || 0;
}
