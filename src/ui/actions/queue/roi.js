function toMoneyPerHour(entry = {}) {
  if (Number.isFinite(entry?.moneyPerHour)) {
    return entry.moneyPerHour;
  }
  const payout = Number.isFinite(entry?.payout) ? entry.payout : 0;
  const duration = Number.isFinite(entry?.durationHours) && entry.durationHours > 0
    ? entry.durationHours
    : null;
  return duration ? payout / duration : payout;
}

export function compareByRoi(a = {}, b = {}) {
  const roiA = toMoneyPerHour(a);
  const roiB = toMoneyPerHour(b);

  if (roiA !== roiB) {
    return roiB - roiA;
  }

  const payoutA = Number.isFinite(a?.payout) ? a.payout : 0;
  const payoutB = Number.isFinite(b?.payout) ? b.payout : 0;
  if (payoutA !== payoutB) {
    return payoutB - payoutA;
  }

  const durationA = Number.isFinite(a?.durationHours) ? a.durationHours : Infinity;
  const durationB = Number.isFinite(b?.durationHours) ? b.durationHours : Infinity;
  if (durationA !== durationB) {
    return durationA - durationB;
  }

  const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : 0;
  const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : 0;
  return orderA - orderB;
}

export function rankEntriesByRoi(entries = []) {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return Array.isArray(entries) ? [...entries] : [];
  }
  return [...entries].sort(compareByRoi);
}

export default {
  compareByRoi,
  rankEntriesByRoi
};
