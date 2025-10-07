import { getState } from '../../../../core/state.js';
import { spendMoney } from '../../../currency.js';
import { recordCostContribution } from '../../../metrics.js';
import { applyMetric } from '../metrics.js';

export function createAcceptanceCostApplier({ metadata }) {
  return function applyAcceptanceCost({ state = getState(), instance } = {}) {
    if (!metadata.cost || metadata.cost <= 0) {
      if (instance) {
        instance.__pendingAcceptanceCost = 0;
      }
      return { paid: 0 };
    }

    const workingState = state || getState();
    if (!workingState) {
      return { paid: 0 };
    }

    const pending = Number(instance?.__pendingAcceptanceCost ?? metadata.cost);
    if (!Number.isFinite(pending) || pending <= 0) {
      if (instance) {
        instance.__pendingAcceptanceCost = 0;
      }
      return { paid: 0 };
    }

    if (instance?.__acceptanceCostApplied) {
      return { paid: 0 };
    }

    spendMoney(pending);
    applyMetric(recordCostContribution, metadata.metrics?.cost, { amount: pending });

    if (instance) {
      instance.costPaid = (instance.costPaid || 0) + pending;
      instance.__pendingAcceptanceCost = 0;
      instance.__acceptanceCostApplied = true;
    }

    return { paid: pending };
  };
}
