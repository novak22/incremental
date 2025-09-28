import { formatList, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import { addMoney, spendMoney } from '../currency.js';
import { spendTime } from '../time.js';
import { ASSETS } from './registry.js';
import { instanceLabel, rollDailyIncome } from './helpers.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from '../metrics.js';

export function allocateAssetMaintenance() {
  const state = getState();
  if (!state) return;

  const setupFunded = [];
  const setupMissed = [];
  const maintenanceFunded = [];
  const maintenanceSkippedTime = [];
  const maintenanceSkippedFunds = [];

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id);
    const setupHours = Number(definition.setup?.hoursPerDay) || 0;
    const maintenanceHours = Number(definition.maintenance?.hours) || 0;
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
            key: `asset:${definition.id}:setup-time`,
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
        instance.maintenanceFundedToday = false;
        if (maintenanceHours <= 0 && maintenanceCost <= 0) {
          instance.maintenanceFundedToday = true;
          return;
        }
        const label = instanceLabel(definition, index);
        const lacksTime = maintenanceHours > 0 && state.timeLeft < maintenanceHours;
        const lacksMoney = maintenanceCost > 0 && state.money < maintenanceCost;
        if (lacksTime || lacksMoney) {
          if (lacksTime) maintenanceSkippedTime.push(label);
          if (lacksMoney) maintenanceSkippedFunds.push(label);
          return;
        }
        if (maintenanceHours > 0) {
          spendTime(maintenanceHours);
          recordTimeContribution({
            key: `asset:${definition.id}:maintenance-time`,
            label: `🛠️ ${definition.singular || definition.name} upkeep`,
            hours: maintenanceHours,
            category: 'maintenance'
          });
        }
        if (maintenanceCost > 0) {
          spendMoney(maintenanceCost);
          recordCostContribution({
            key: `asset:${definition.id}:maintenance-cost`,
            label: `🔧 ${definition.singular || definition.name} upkeep`,
            amount: maintenanceCost,
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
        return;
      }

      if (instance.status === 'active') {
        if (instance.maintenanceFundedToday) {
          const payout = rollDailyIncome(definition, assetState, instance);
          instance.lastIncome = payout;
          instance.totalIncome = (instance.totalIncome || 0) + payout;
          const label = instanceLabel(definition, index);
          const message = definition.messages?.income
            ? definition.messages.income(payout, label, instance, assetState)
            : `${definition.name} generated $${formatMoney(payout)} today.`;
          addMoney(payout, message, definition.income?.logType || 'passive');
          recordPayoutContribution({
            key: `asset:${definition.id}:payout`,
            label: `💰 ${definition.singular || definition.name}`,
            amount: payout,
            category: 'passive'
          });
        } else {
          instance.lastIncome = 0;
          const label = instanceLabel(definition, index);
          const message = definition.messages?.maintenanceSkipped
            ? definition.messages.maintenanceSkipped(label, assetState, instance)
            : `${label} skipped maintenance and earned nothing today.`;
          addLog(message, 'warning');
        }
        instance.maintenanceFundedToday = false;
      }
    });
  }
}
