import { describeAssetLaunchAvailability } from '../assets.js';
import { getDailyIncomeRange } from '../../../../game/assets/payout.js';
import { getUpgradeSnapshot } from '../upgrades.js';
import { describeHustleRequirements } from '../../../../game/hustles/helpers.js';
import { ensureArray, toCurrency } from './utils.js';

export function buildAssetOpportunities(assetDefinitions = [], state, services = {}) {
  const {
    describeAssetLaunchAvailability: describeAvailability = describeAssetLaunchAvailability,
    getDailyIncomeRange: getDailyIncomeRangeFn = getDailyIncomeRange
  } = services;

  return assetDefinitions
    .map(definition => {
      const availability = describeAvailability(definition, state);
      const setupDays = Number(definition.setup?.days) || 0;
      const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
      const totalHours = toCurrency(setupDays * hoursPerDay);
      const payoutRange = getDailyIncomeRangeFn(definition);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(definition.setup?.cost || 0),
        ready: !availability.disabled,
        reasons: availability.reasons || [],
        setup: {
          days: setupDays,
          hoursPerDay,
          totalHours
        },
        payoutRange: {
          min: toCurrency(payoutRange?.min),
          max: toCurrency(payoutRange?.max)
        }
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

export function buildUpgradeOpportunities(upgradeDefinitions = [], state, services = {}) {
  const {
    getUpgradeSnapshot: getUpgradeSnapshotFn = getUpgradeSnapshot
  } = services;

  return upgradeDefinitions
    .map(definition => {
      const snapshot = getUpgradeSnapshotFn(definition, state);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(snapshot.cost),
        ready: snapshot.ready,
        purchased: snapshot.purchased,
        affordable: snapshot.affordable,
        description: definition.description || ''
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

export function buildHustleOpportunities(hustleDefinitions = [], state, services = {}) {
  const {
    describeHustleRequirements: describeRequirements = describeHustleRequirements
  } = services;

  return hustleDefinitions
    .map(definition => {
      const time = Number(definition.time || definition.action?.timeCost) || 0;
      const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
      const roi = time > 0 ? payout / time : payout;
      const requirements = ensureArray(describeRequirements?.(definition, state)).map(req => ({
        label: req.label,
        met: req.met
      }));
      return {
        id: definition.id,
        name: definition.name || definition.id,
        time,
        payout,
        roi,
        requirements
      };
    })
    .sort((a, b) => b.roi - a.roi);
}

export function buildOpportunitySummary(assets, upgrades, hustles) {
  return {
    assets,
    upgrades,
    hustles
  };
}

