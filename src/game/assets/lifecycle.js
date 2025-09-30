import { formatHours, formatList, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import { addMoney, spendMoney } from '../currency.js';
import { spendTime } from '../time.js';
import { ASSETS } from './registry.js';
import { getAssetMetricId, instanceLabel, rollDailyIncome } from './helpers.js';
import { ASSISTANT_CONFIG, getAssistantCount } from '../assistant.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from '../metrics.js';
import { getAssetEffectMultiplier } from '../upgrades/effects.js';

function findAssetDefinition(assetId) {
  return ASSETS.find(entry => entry.id === assetId) || null;
}

function describeMaintenanceSkip(definition, label, assetState, instance) {
  if (typeof definition?.messages?.maintenanceSkipped === 'function') {
    return definition.messages.maintenanceSkipped(label, assetState, instance);
  }
  return `${label} skipped maintenance and stalled out today.`;
}

export function maintainAssetInstance(assetId, instanceId) {
  const state = getState();
  if (!state) {
    return { success: false, reason: 'no-state' };
  }

  const definition = findAssetDefinition(assetId);
  if (!definition) {
    return { success: false, reason: 'unknown-asset' };
  }

  const assetState = getAssetState(definition.id, state);
  const index = assetState.instances.findIndex(entry => entry?.id === instanceId);
  if (index === -1) {
    return { success: false, reason: 'missing-instance' };
  }

  const instance = assetState.instances[index];
  const label = instanceLabel(definition, index);

  if (instance.status !== 'active') {
    addLog(`${label} isn’t live yet, so there’s no upkeep to fund.`, 'info');
    return { success: false, reason: 'inactive' };
  }

  if (instance.maintenanceFundedToday) {
    addLog(`${label} already enjoyed its upkeep today.`, 'info');
    return { success: false, reason: 'already-maintained' };
  }

  const baseMaintenanceHours = Number(definition.maintenance?.hours) || 0;
  const maintenanceEffect = getAssetEffectMultiplier(definition, 'maint_time_mult', {
    actionType: 'maintenance'
  });
  const maintenanceHours = baseMaintenanceHours * (Number.isFinite(maintenanceEffect.multiplier)
    ? maintenanceEffect.multiplier
    : 1);
  const maintenanceCost = Number(definition.maintenance?.cost) || 0;

  const pendingIncome = Math.max(0, Number(instance.pendingIncome) || 0);
  const availableMoney = state.money + pendingIncome;

  if (maintenanceCost > availableMoney) {
    addLog(describeMaintenanceSkip(definition, label, assetState, instance), 'warning');
    return { success: false, reason: 'insufficient-money' };
  }

  if (maintenanceHours > state.timeLeft) {
    addLog(
      `${label} needs ${formatHours(maintenanceHours)} today, but you’re out of hours.`,
      'warning'
    );
    return { success: false, reason: 'insufficient-time' };
  }

  if (pendingIncome > 0) {
    const incomeMessage = definition.messages?.income
      ? definition.messages.income(pendingIncome, label, instance, assetState)
      : `${label} delivered $${formatMoney(pendingIncome)} from yesterday’s grind.`;
    addMoney(pendingIncome, incomeMessage, definition.income?.logType || 'passive');
    recordPayoutContribution({
      key: getAssetMetricId(definition, 'payout', 'payout'),
      label: `💰 ${definition.singular || definition.name}`,
      amount: pendingIncome,
      category: 'passive'
    });
    instance.pendingIncome = 0;
  }

  if (maintenanceCost > 0) {
    spendMoney(maintenanceCost);
    recordCostContribution({
      key: getAssetMetricId(definition, 'maintenance', 'cost'),
      label: `🔧 ${definition.singular || definition.name} upkeep`,
      amount: maintenanceCost,
      category: 'maintenance'
    });
  }

  if (maintenanceHours > 0) {
    spendTime(maintenanceHours);
    recordTimeContribution({
      key: getAssetMetricId(definition, 'maintenance', 'time'),
      label: `🛠️ ${definition.singular || definition.name} upkeep`,
      hours: maintenanceHours,
      category: 'maintenance'
    });
  }

  instance.maintenanceFundedToday = true;
  addLog(`${label} is fully maintained and ready to earn.`, 'info');
  return { success: true };
}

export function allocateAssetMaintenance() {
  const state = getState();
  if (!state) return;

  const assistantCount = getAssistantCount(state);
  let assistantHoursRemaining = Math.max(
    0,
    assistantCount * ASSISTANT_CONFIG.hoursPerAssistant
  );

  const setupFunded = [];
  const setupMissed = [];
  const maintenanceFunded = [];
  const maintenanceSkippedTime = [];
  const maintenanceSkippedFunds = [];

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id);
    const baseSetupHours = Number(definition.setup?.hoursPerDay) || 0;
    const setupEffect = getAssetEffectMultiplier(definition, 'setup_time_mult', {
      actionType: 'setup'
    });
    const setupHours = baseSetupHours * (Number.isFinite(setupEffect.multiplier) ? setupEffect.multiplier : 1);
    const baseMaintenanceHours = Number(definition.maintenance?.hours) || 0;
    const maintenanceEffect = getAssetEffectMultiplier(definition, 'maint_time_mult', {
      actionType: 'maintenance'
    });
    const maintenanceHours = baseMaintenanceHours * (Number.isFinite(maintenanceEffect.multiplier) ? maintenanceEffect.multiplier : 1);
    const maintenanceCost = Number(definition.maintenance?.cost) || 0;

    assetState.instances.forEach((instance, index) => {
      if (instance.status === 'setup') {
        instance.setupFundedToday = false;
        if (setupHours <= 0) {
          instance.setupFundedToday = true;
          return;
        }
        if (state.timeLeft >= setupHours) {
          spendTime(setupHours);
          instance.setupFundedToday = true;
          setupFunded.push(instanceLabel(definition, index));
          recordTimeContribution({
            key: getAssetMetricId(definition, 'setup', 'time'),
            label: `🚀 ${definition.singular || definition.name} prep`,
            hours: setupHours,
            category: 'setup'
          });
        } else {
          setupMissed.push(instanceLabel(definition, index));
        }
        return;
      }

      if (instance.status === 'active') {
        const label = instanceLabel(definition, index);
        const pendingIncome = Math.max(0, Number(instance.pendingIncome) || 0);

        const potentialAssistantHours = Math.min(assistantHoursRemaining, maintenanceHours);
        const manualHoursRequired = Math.max(0, maintenanceHours - potentialAssistantHours);
        const lacksTime = manualHoursRequired > 0 && state.timeLeft < manualHoursRequired;
        const availableMoney = state.money + pendingIncome;
        const lacksMoney = maintenanceCost > 0 && availableMoney < maintenanceCost;

        if (lacksTime || lacksMoney) {
          if (lacksTime) maintenanceSkippedTime.push(label);
          if (lacksMoney) maintenanceSkippedFunds.push(label);
          return;
        }

        if (pendingIncome > 0) {
          const incomeMessage = definition.messages?.income
            ? definition.messages.income(pendingIncome, label, instance, assetState)
            : `${definition.name} generated $${formatMoney(pendingIncome)} today.`;
          addMoney(pendingIncome, incomeMessage, definition.income?.logType || 'passive');
          recordPayoutContribution({
            key: getAssetMetricId(definition, 'payout', 'payout'),
            label: `💰 ${definition.singular || definition.name}`,
            amount: pendingIncome,
            category: 'passive'
          });
          instance.pendingIncome = 0;
        }

        instance.maintenanceFundedToday = false;
        if (maintenanceHours <= 0 && maintenanceCost <= 0) {
          instance.maintenanceFundedToday = true;
          return;
        }

        if (maintenanceCost > 0) {
          spendMoney(maintenanceCost);
          recordCostContribution({
            key: getAssetMetricId(definition, 'maintenance', 'cost'),
            label: `🔧 ${definition.singular || definition.name} upkeep`,
            amount: maintenanceCost,
            category: 'maintenance'
          });
        }

        if (potentialAssistantHours > 0) {
          assistantHoursRemaining = Math.max(0, assistantHoursRemaining - potentialAssistantHours);
          recordTimeContribution({
            key: `${getAssetMetricId(definition, 'maintenance', 'time')}:assistant`,
            label: `🤖 ${definition.singular || definition.name} upkeep`,
            hours: potentialAssistantHours,
            category: 'maintenance:assistant'
          });
        }

        if (manualHoursRequired > 0) {
          spendTime(manualHoursRequired);
          recordTimeContribution({
            key: getAssetMetricId(definition, 'maintenance', 'time'),
            label: `🛠️ ${definition.singular || definition.name} upkeep`,
            hours: manualHoursRequired,
            category: 'maintenance'
          });
        }
        instance.maintenanceFundedToday = true;
        maintenanceFunded.push(label);
      }
    });
  }

  if (setupFunded.length) {
    addLog(`You invested setup time into ${formatList(setupFunded)}. Momentum maintained!`, 'info');
  }
  if (setupMissed.length) {
    addLog(`${formatList(setupMissed)} could not advance because you ran out of hours.`, 'warning');
  }
  if (maintenanceFunded.length) {
    addLog(`Daily upkeep handled for ${formatList(maintenanceFunded)}.`, 'info');
  }
  if (maintenanceSkippedTime.length) {
    const unique = [...new Set(maintenanceSkippedTime)];
    addLog(`${formatList(unique)} missed upkeep because you ran out of hours.`, 'warning');
  }
  if (maintenanceSkippedFunds.length) {
    const unique = [...new Set(maintenanceSkippedFunds)];
    addLog(`${formatList(unique)} stalled because upkeep cash wasn't available.`, 'warning');
  }
}

export function closeOutDay() {
  const state = getState();
  if (!state) return;

  const startOfDay = state.day;

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id);
    const totalSetupDays = Math.max(0, Number(definition.setup?.days) || 0);

    assetState.instances.forEach((instance, index) => {
      if (instance.status === 'setup') {
        if (instance.setupFundedToday) {
          instance.daysRemaining = Math.max(0, (instance.daysRemaining || totalSetupDays) - 1);
          instance.daysCompleted = Math.min(totalSetupDays, (instance.daysCompleted || 0) + 1);
          const label = instanceLabel(definition, index);
          if (instance.daysRemaining <= 0) {
            instance.status = 'active';
            instance.setupFundedToday = false;
            instance.maintenanceFundedToday = false;
            instance.lastIncome = 0;
            instance.totalIncome = instance.totalIncome || 0;
            instance.createdOnDay = startOfDay;
            const message = definition.messages?.setupComplete
              ? definition.messages.setupComplete(label, assetState, instance)
              : `${label} wrapped setup and is ready to earn!`;
            addLog(message, 'passive');
          } else {
            const message = definition.messages?.setupProgress
              ? definition.messages.setupProgress(label, totalSetupDays - instance.daysRemaining, totalSetupDays)
              : `${label} moved closer to launch (${totalSetupDays - instance.daysRemaining}/${totalSetupDays}).`;
            addLog(message, 'info');
          }
        } else {
          const label = instanceLabel(definition, index);
          const message = definition.messages?.setupMissed
            ? definition.messages.setupMissed(label, assetState, instance)
            : `${label} did not receive setup time today, so progress paused.`;
          addLog(message, 'warning');
        }
        instance.setupFundedToday = false;
        instance.dailyUsage = {};
        return;
      }

      if (instance.status === 'active') {
        if (instance.maintenanceFundedToday) {
          const payout = rollDailyIncome(definition, assetState, instance);
          instance.lastIncome = payout;
          instance.totalIncome = (instance.totalIncome || 0) + payout;
          instance.pendingIncome = (instance.pendingIncome || 0) + payout;
        } else {
          instance.lastIncome = 0;
          instance.lastIncomeBreakdown = null;
          instance.pendingIncome = 0;
          const label = instanceLabel(definition, index);
          const message = definition.messages?.maintenanceSkipped
            ? definition.messages.maintenanceSkipped(label, assetState, instance)
            : `${label} skipped maintenance and earned nothing today.`;
          addLog(message, 'warning');
        }
        instance.maintenanceFundedToday = false;
        instance.dailyUsage = {};
      }
    });
  }
}
